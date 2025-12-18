import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Easing,
  Vibration,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const BreathingExerciseModal = ({
  visible,
  onClose,
  onComplete,
  activity,
}) => {
  const [phase, setPhase] = useState('ready'); // ready, inhale, hold, exhale, holdAfterExhale, complete
  const [currentCycle, setCurrentCycle] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const [phaseTimeLeft, setPhaseTimeLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef(null);

  const instructions = activity?.instructions || {
    inhale: 4,
    hold: 4,
    exhale: 4,
    cycles: 4,
  };

  const totalCycles = instructions.cycles || 4;

  const triggerHaptic = useCallback(() => {
    if (Platform.OS === 'ios') {
      // Soft haptic on iOS
      Vibration.vibrate(10);
    } else {
      // Short vibration on Android
      Vibration.vibrate(50);
    }
  }, []);

  const getPhaseLabel = () => {
    switch (phase) {
      case 'ready':
        return 'Get Ready';
      case 'inhale':
        return 'Breathe In';
      case 'hold':
        return 'Hold';
      case 'exhale':
        return 'Breathe Out';
      case 'holdAfterExhale':
        return 'Hold';
      case 'complete':
        return 'Complete!';
      default:
        return '';
    }
  };

  const getPhaseColor = () => {
    switch (phase) {
      case 'inhale':
        return '#10B981';
      case 'hold':
      case 'holdAfterExhale':
        return '#F59E0B';
      case 'exhale':
        return '#6366F1';
      case 'complete':
        return '#10B981';
      default:
        return '#6366F1';
    }
  };

  const animateBreath = useCallback((toValue, duration) => {
    Animated.timing(scaleAnim, {
      toValue,
      duration: duration * 1000,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const runPhase = useCallback((phaseName, duration, nextPhase) => {
    setPhase(phaseName);
    setPhaseTimeLeft(duration);
    triggerHaptic();

    // Animate based on phase
    if (phaseName === 'inhale') {
      animateBreath(1.5, duration);
    } else if (phaseName === 'exhale') {
      animateBreath(1, duration);
    }

    let timeLeft = duration;
    timerRef.current = setInterval(() => {
      timeLeft -= 1;
      setPhaseTimeLeft(timeLeft);

      if (timeLeft <= 0) {
        clearInterval(timerRef.current);
        nextPhase();
      }
    }, 1000);
  }, [animateBreath, triggerHaptic]);

  const runCycle = useCallback((cycleNum) => {
    if (cycleNum > totalCycles) {
      setPhase('complete');
      setIsRunning(false);
      triggerHaptic();
      return;
    }

    setCurrentCycle(cycleNum);

    // Start with inhale
    runPhase('inhale', instructions.inhale, () => {
      // Then hold (if defined)
      if (instructions.hold > 0) {
        runPhase('hold', instructions.hold, () => {
          // Then exhale
          runPhase('exhale', instructions.exhale, () => {
            // Then hold after exhale (if defined, for box breathing)
            if (instructions.holdAfterExhale > 0) {
              runPhase('holdAfterExhale', instructions.holdAfterExhale, () => {
                runCycle(cycleNum + 1);
              });
            } else {
              runCycle(cycleNum + 1);
            }
          });
        });
      } else {
        // No hold, go straight to exhale
        runPhase('exhale', instructions.exhale, () => {
          if (instructions.holdAfterExhale > 0) {
            runPhase('holdAfterExhale', instructions.holdAfterExhale, () => {
              runCycle(cycleNum + 1);
            });
          } else {
            runCycle(cycleNum + 1);
          }
        });
      }
    });
  }, [instructions, runPhase, totalCycles, triggerHaptic]);

  const startExercise = useCallback(() => {
    setIsRunning(true);
    setPhase('ready');
    setCountdown(3);

    // Countdown before starting
    let count = 3;
    const countdownInterval = setInterval(() => {
      count -= 1;
      setCountdown(count);

      if (count <= 0) {
        clearInterval(countdownInterval);
        runCycle(1);
      }
    }, 1000);

    timerRef.current = countdownInterval;
  }, [runCycle]);

  const stopExercise = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setIsRunning(false);
    setPhase('ready');
    setCurrentCycle(0);
    scaleAnim.setValue(1);
  }, [scaleAnim]);

  const handleComplete = () => {
    onComplete && onComplete();
    handleClose();
  };

  const handleClose = () => {
    stopExercise();
    onClose();
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!visible) {
      stopExercise();
    }
  }, [visible, stopExercise]);

  if (!activity) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Icon name="close" size={28} color="#6B7280" />
          </TouchableOpacity>
          <Text style={styles.title}>{activity.name}</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Main content */}
        <View style={styles.content}>
          {/* Cycle indicator */}
          {isRunning && phase !== 'ready' && phase !== 'complete' && (
            <Text style={styles.cycleText}>
              Cycle {currentCycle} of {totalCycles}
            </Text>
          )}

          {/* Breathing circle */}
          <View style={styles.circleContainer}>
            <Animated.View
              style={[
                styles.breathCircle,
                {
                  backgroundColor: getPhaseColor(),
                  transform: [{ scale: scaleAnim }],
                },
              ]}
            >
              <Text style={styles.phaseLabel}>{getPhaseLabel()}</Text>
              {phase === 'ready' && isRunning && (
                <Text style={styles.countdownText}>{countdown}</Text>
              )}
              {phase !== 'ready' && phase !== 'complete' && isRunning && (
                <Text style={styles.timerText}>{phaseTimeLeft}</Text>
              )}
              {phase === 'complete' && (
                <Icon name="checkmark-circle" size={48} color="#fff" />
              )}
            </Animated.View>
          </View>

          {/* Instructions */}
          {!isRunning && phase !== 'complete' && (
            <View style={styles.instructionsContainer}>
              <Text style={styles.instructionsTitle}>Pattern:</Text>
              <Text style={styles.instructionsText}>
                Inhale: {instructions.inhale}s
                {instructions.hold > 0 && ` | Hold: ${instructions.hold}s`}
                {' | '}Exhale: {instructions.exhale}s
                {instructions.holdAfterExhale > 0 && ` | Hold: ${instructions.holdAfterExhale}s`}
              </Text>
              <Text style={styles.cyclesText}>{totalCycles} cycles</Text>
            </View>
          )}
        </View>

        {/* Footer with buttons */}
        <View style={styles.footer}>
          {!isRunning && phase !== 'complete' && (
            <TouchableOpacity
              style={styles.startButton}
              onPress={startExercise}
            >
              <Icon name="play" size={24} color="#fff" />
              <Text style={styles.startButtonText}>Start Exercise</Text>
            </TouchableOpacity>
          )}

          {isRunning && phase !== 'complete' && (
            <TouchableOpacity
              style={styles.stopButton}
              onPress={stopExercise}
            >
              <Icon name="stop" size={24} color="#fff" />
              <Text style={styles.stopButtonText}>Stop</Text>
            </TouchableOpacity>
          )}

          {phase === 'complete' && (
            <TouchableOpacity
              style={styles.completeButton}
              onPress={handleComplete}
            >
              <Icon name="checkmark" size={24} color="#fff" />
              <Text style={styles.completeButtonText}>Complete</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  placeholder: {
    width: 44,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  cycleText: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 24,
  },
  circleContainer: {
    width: 250,
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
  },
  breathCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  phaseLabel: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  countdownText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
  },
  timerText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
  },
  instructionsContainer: {
    marginTop: 40,
    alignItems: 'center',
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  cyclesText: {
    fontSize: 14,
    color: '#6366F1',
    marginTop: 8,
    fontWeight: '500',
  },
  footer: {
    padding: 24,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  startButton: {
    flexDirection: 'row',
    backgroundColor: '#6366F1',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  stopButton: {
    flexDirection: 'row',
    backgroundColor: '#EF4444',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  completeButton: {
    flexDirection: 'row',
    backgroundColor: '#10B981',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default BreathingExerciseModal;
