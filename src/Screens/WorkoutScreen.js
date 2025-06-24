import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  ScrollView
} from 'react-native';
import { Audio } from 'expo-av';
import { FontAwesome } from '@expo/vector-icons';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { serverTimestamp } from 'firebase/firestore';


const numberWordsMap = new Map([
  ['to', 2], ['too', 2], ['two', 2], ['for', 4], ['four', 4], ['tree', 3], ['three', 3]
]);

const normalizeNumbers = (input) => {
  return input.replace(/\b(to|too|two|for|four|tree|three)\b/gi, match => 
    numberWordsMap.get(match.toLowerCase()) ?? match
  );
};

const parseSetNumbers = (input) => {
  return input.replace(/(\d+)(st|nd|rd|th)/gi, '$1'); // Remove end suffix so number gets recognized
};



const WorkoutScreen = ({ navigation }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState(null);
  const [transcription, setTranscription] = useState('');
  const [workout, setWorkout] = useState({
    exercise: '',
    sets: [{ reps: '', weight: '' }]
  });

  const addSet = () => {
    setWorkout(prev => ({
      ...prev,
      sets: [...prev.sets, { reps: '', weight: '' }]
    }));
  };

  const deleteSet = (index) => {
    const newSets = workout.sets.filter((_, i) => i !== index);
    setWorkout(prev => ({ ...prev, sets: newSets }));
  };

  const updateSet = (index, field, value) => {
    const newSets = [...workout.sets];
    newSets[index][field] = value;
    setWorkout(prev => ({ ...prev, sets: newSets }));
  };

  const parseVoiceInput = (input) => {
    if (!input) return;
  
    // Normalize input for number conversion
    let normalizedInput = normalizeNumbers(input);
    normalizedInput = parseSetNumbers(normalizedInput);
    
    // Extract exercise name and sets
    const exerciseMatch = normalizedInput.match(/(.+?)(?=\bset\b|\d|$)/i);
    const setsMatches = [...normalizedInput.matchAll(/set\s+(\d+|one|two|three|four)\s+(\d+)\s+reps?\s+(\d+)\s+(lbs|pounds)/gi)];
  
    // Convert matches to numeric values
    const parsedSets = setsMatches.map(match => ({
      setNumber: parseInt(match[1].replace(/\D/g, '')) || parseInt(match[1]),
      reps: match[2],
      weight: match[3]
    }));
  
    // Find maximum set number
    const maxSetNumber = parsedSets.reduce((max, set) => Math.max(max, set.setNumber), 0);
  
    // Add empty sets if needed
    if (maxSetNumber > workout.sets.length) {
      const newSets = [...workout.sets];
      while (newSets.length < maxSetNumber) {
        newSets.push({ reps: '', weight: '' });
      }
      setWorkout(prev => ({
        exercise: prev.exercise,
        sets: newSets
      }));
    }
  
    // Update existing sets with voice data
    const updatedSets = workout.sets.map((set, index) => {
      const voiceSet = parsedSets.find(s => s.setNumber === index + 1);
      return voiceSet ? {
        reps: voiceSet.reps.toString(),
        weight: voiceSet.weight.toString()
      } : set;
    });
  
    setWorkout({
      exercise: exerciseMatch ? exerciseMatch[1].trim() : workout.exercise,
      sets: updatedSets
    });
  };
    
  // saves workout data
  const saveWorkoutToFirebase = async () => {
    const auth = getAuth();
    const userId = auth.currentUser?.uid;
    
    if (!userId) {
      Alert.alert('Error', 'You must be logged in to save workouts');
      return;
    }

    // gets workout data
    const db = getFirestore();
    try {
      for (const set of workout.sets) {
        await addDoc(collection(db, 'workouts'), {
          ...set,
          exercise: workout.exercise,
          userId,
          date: new Date().toISOString().split('T')[0],
          timestamp: serverTimestamp()
        });
      }
      Alert.alert('Success', 'Workout saved!');
      setWorkout({ exercise: '', sets: [{ reps: '', weight: '' }] });
      setTranscription('');
    } catch (error) {
      Alert.alert('Error', 'Failed to save workout');
    }
  };

  // Start recording audio
  const startRecording = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  // Stop recording audio and process transcription
  const stopRecording = async () => {
    try {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      console.log('Recording saved at:', uri);

      processAudioToText(uri);
    } catch (err) {
      console.error('Failed to stop recording', err);
    }
  };

  // Process audio file for transcription
  const processAudioToText = async (uri) => {
    try {
      const formData = new FormData();
      formData.append('audio', {
        uri,
        type: 'audio/wav',
        name: 'audio.wav',
      });

      const response = await fetch('https://liftlog-transcription.onrender.com/transcribe', { // Replace with ur server's IP address, now instead use deployed backend link
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Transcription:', data.transcription);
        setTranscription(data.transcription);
        parseVoiceInput(data.transcription);
      } else {
        console.error('Error:', response.statusText);
      }
    } catch (error) {
      console.error('Error processing audio:', error);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* <Image
            source={require('../../assets/mic_background.png')}
            style={styles.backgroundImage}
          /> */}

          <View style={styles.header}>
            <Text style={styles.title}>LiftLog</Text>
            <Text style={styles.subtitle}>Your Smart Workout Tracker</Text>
          </View>

          <TextInput
            style={styles.exerciseInput}
            placeholder="Exercise Name"
            placeholderTextColor="#666"
            value={workout.exercise}
            onChangeText={text => setWorkout(prev => ({ ...prev, exercise: text }))}
          />

          <View style={styles.setsContainer}>
            {workout.sets.map((set, index) => (
              <View key={index} style={styles.setCard}>
                <View style={styles.setHeader}>
                  <Text style={styles.setNumber}>Set #{index + 1}</Text>
                  <TouchableOpacity onPress={() => deleteSet(index)}>
                    <FontAwesome name="times-circle" size={20} color="#ff4444" />
                  </TouchableOpacity>
                </View>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.setInput}
                    placeholder="Reps"
                    value={set.reps}
                    onChangeText={text => updateSet(index, 'reps', text)}
                    keyboardType="numeric"
                  />
                  <TextInput
                    style={styles.setInput}
                    placeholder="Weight (lbs)"
                    value={set.weight}
                    onChangeText={text => updateSet(index, 'weight', text)}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            ))}

          </View>

          <TouchableOpacity style={styles.addButton} onPress={addSet}>
            <FontAwesome name="plus-circle" size={20} color="#fff" />
            <Text style={styles.buttonText}>Add Set</Text>
          </TouchableOpacity>

          <View style={styles.buttonGroup}>
            <TouchableOpacity 
              style={[styles.actionButton, isRecording && styles.recordingButton]}
              onPress={isRecording ? stopRecording : startRecording}
            >
              <FontAwesome name="microphone" size={20} color="#fff" />
              <Text style={styles.buttonText}>
                {isRecording ? 'Stop Recording' : 'Start Recording'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionButton}
              onPress={saveWorkoutToFirebase}
            >
              <FontAwesome name="save" size={20} color="#fff" />
              <Text style={styles.buttonText}>Save Workout</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('Calendar')}
            >
              <FontAwesome name="calendar" size={20} color="#fff" />
              <Text style={styles.buttonText}>View Calendar</Text>
            </TouchableOpacity>
          </View>

          {transcription && (
            <View style={styles.transcriptionBox}>
              <Text style={styles.transcriptionLabel}>Transcript:</Text>
              <Text style={styles.transcriptionText}>{transcription}</Text>
            </View>
          )}
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
    container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    flex: 1,
    padding: 20,
  },
  backgroundImage: {
    position: 'absolute',
    opacity: 0.1,
    width: '100%',
    height: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#2c3e50',
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    marginTop: 5,
  },
  exerciseInput: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  setsContainer: {
    marginBottom: 20,
  },
  setCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  setHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  setNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  setInput: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#2c3e50',
  },
  addButton: {
    flexDirection: 'row',
    backgroundColor: '#3498db',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
  },
  buttonGroup: {
    gap: 15,
  },
  actionButton: {
    flexDirection: 'row',
    backgroundColor: '#2ecc71',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  recordingButton: {
    backgroundColor: '#e83523',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  transcriptionBox: {
    backgroundColor: '#ecf0f1',
    borderRadius: 10,
    padding: 15,
    marginTop: 20,
  },
  transcriptionLabel: {
    color: '#7f8c8d',
    fontSize: 14,
    marginBottom: 5,
  },
  transcriptionText: {
    color: '#2c3e50',
    fontSize: 16,
  },
});

export default WorkoutScreen;
