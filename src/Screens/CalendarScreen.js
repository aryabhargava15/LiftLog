import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { FontAwesome } from '@expo/vector-icons';


const CalendarScreen = () => {
  // const calendarRef = useRef(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [workouts, setWorkouts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [markedDates, setMarkedDates] = useState({});

  useEffect(() => {
    fetchWorkoutDates();
    fetchWorkoutsForDate(selectedDate);
  }, []);
  // fetches the snapshots of each workout date
  const fetchWorkoutDates = async () => {
    const auth = getAuth();
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const db = getFirestore();
    const workoutsRef = collection(db, 'workouts');
    const q = query(workoutsRef, where('userId', '==', userId));

    const querySnapshot = await getDocs(q);
    const dates = querySnapshot.docs.reduce((acc, doc) => {
      const date = doc.data().date;
      acc[date] = { marked: true, dotColor: '#2ecc71' };
      return acc;
    }, {});

    // Add current date selection
    dates[selectedDate] = { 
      selected: true, 
      selectedColor: '#2ecc71',
      selectedTextColor: 'white',
      dotColor: '#2ecc71'
    };

    setMarkedDates(dates);
  };
  
  const fetchWorkoutsForDate = async (date) => {
    setIsLoading(true);
    try {
      const auth = getAuth();
      const userId = auth.currentUser?.uid;
      if (!userId) return;
  
      const db = getFirestore();
      const workoutsRef = collection(db, 'workouts');
      const q = query(workoutsRef, 
        where('userId', '==', userId), 
        where('date', '==', date)
      );

      
      const querySnapshot = await getDocs(q);
      const workoutsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate?.() || new Date()
      }));

      
      const groupedWorkouts = workoutsData.reduce((acc, workout) => {  // Group workouts by exercise and sort by timestamp
        const key = workout.exercise;
        if (!acc[key]) {
          acc[key] = {
            exercise: workout.exercise,
            sets: [],
            totalReps: 0,
            maxWeight: 0,
            minWeight: Infinity,
            timestamps: []
          };
        }
        
        acc[key].sets.push({
          reps: parseInt(workout.reps) || 0,
          weight: parseInt(workout.weight) || 0
        });
        
        acc[key].totalReps += parseInt(workout.reps) || 0;
        acc[key].maxWeight = Math.max(acc[key].maxWeight, parseInt(workout.weight) || 0);
        acc[key].minWeight = Math.min(acc[key].minWeight, parseInt(workout.weight) || Infinity);
        acc[key].timestamps.push(workout.timestamp);

        return acc;
      }, {});

      // Sort by earliest timestamp
      const sortedWorkouts = Object.values(groupedWorkouts)
      .map(exercise => ({
        ...exercise,
        timestamps: exercise.timestamps.sort((a, b) => a - b)
      }))
      .sort((a, b) => a.timestamps[0] - b.timestamps[0]);

    setWorkouts(sortedWorkouts);
  } catch (error) {
    console.error('Error fetching workouts:', error);
    Alert.alert('Error', 'Failed to load workouts');
  } finally {
    setIsLoading(false);
  }
};
  // calculates total volume of that current workout
  const getTotalVolume = () => {
    return workouts.reduce((total, exercise) => {
      return total + exercise.sets.reduce((sum, set) => sum + (set.reps * set.weight), 0);
    }, 0);
  };

  const handleDayPress = async (day) => {
    const newMarkedDates = { ...markedDates };
    
    // Remove previous selection
    Object.keys(newMarkedDates).forEach(date => {
      if (newMarkedDates[date].selected) {
        delete newMarkedDates[date].selected;
      }
    });
    
    // Add new selection
    newMarkedDates[day.dateString] = {
      ...newMarkedDates[day.dateString],
      selected: true,
      selectedColor: '#2ecc71',
      selectedTextColor: 'white'
    };

    setSelectedDate(day.dateString);
    setMarkedDates(newMarkedDates);
    await fetchWorkoutsForDate(day.dateString);
  };
  // fetches the workouts for the specific date
  const handleTodayPress = () => {
    const today = new Date().toISOString().split('T')[0];
    // calendarRef.current?.setSelectedDate(today);
    setSelectedDate(today);
    fetchWorkoutsForDate(today);
    
    // Update marked dates
    const newMarkedDates = { ...markedDates };
    Object.keys(newMarkedDates).forEach(date => {
      if (newMarkedDates[date].selected) {
        delete newMarkedDates[date].selected;
      }
    });
    newMarkedDates[today] = {
      ...newMarkedDates[today],
      selected: true,
      selectedColor: '#2ecc71',
      selectedTextColor: 'white'
    };
    setMarkedDates(newMarkedDates);
  };

  return (
    <View style={styles.container}>
      <Calendar
        // ref={calendarRef}
        current={selectedDate}
        onDayPress={handleDayPress}
        markedDates={markedDates}
        theme={{
          calendarBackground: '#ffffff',
          selectedDayBackgroundColor: '#2ecc71',
          selectedDayTextColor: 'white',
          todayTextColor: '#2ecc71',
          todayBackgroundColor: 'rgba(46, 204, 113, 0.1)',
          dayTextColor: '#2d3436',
          textDisabledColor: '#d3d3d3',
          arrowColor: '#2ecc71',
          monthTextColor: '#2d3436',
          textDayFontWeight: '300',
          textMonthFontWeight: 'bold',
          textDayHeaderFontWeight: '600',
          textDayFontSize: 16,
          textMonthFontSize: 18,
          textDayHeaderFontSize: 14
        }}
      />

      <TouchableOpacity style={styles.todayButton} onPress={handleTodayPress}>
        <Text style={styles.todayButtonText}>Go to Today</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {isLoading ? (
          <Text style={styles.loadingText}>Loading...</Text>
        ) : workouts.length === 0 ? (
          <Text style={styles.emptyText}>No workouts recorded for this day</Text>
        ) : (
          <>
            <View style={styles.summaryContainer}>
              <Text style={styles.summaryTitle}>Daily Summary</Text>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryNumber}>{workouts.length}</Text>
                  <Text style={styles.summaryLabel}>Exercises</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryNumber}>
                    {workouts.reduce((total, exercise) => total + exercise.sets.length, 0)}
                  </Text>
                  <Text style={styles.summaryLabel}>Total Sets</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryNumber}>{getTotalVolume()}</Text>
                  <Text style={styles.summaryLabel}>Total Volume</Text>
                </View>
              </View>
            </View>

            {workouts.map((exercise, index) => (
              <View key={index} style={styles.exerciseCard}>
                <View style={styles.exerciseHeader}>
                  <Text style={styles.exerciseName}>{exercise.exercise}</Text>
                </View>

                <View style={styles.statsContainer}>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{exercise.sets.length}</Text>
                    <Text style={styles.statLabel}>Sets</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{exercise.totalReps}</Text>
                    <Text style={styles.statLabel}>Total Reps</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{exercise.maxWeight}</Text>
                    <Text style={styles.statLabel}>Max Weight</Text>
                  </View>
                </View>

                <View style={styles.setsContainer}>
                  {exercise.sets.map((set, setIndex) => (
                    <View key={setIndex} style={styles.setItem}>
                      <Text style={styles.setNumber}>Set {setIndex + 1}</Text>
                      <Text style={styles.setDetail}>{set.reps} reps</Text>
                      <Text style={styles.setDetail}>{set.weight} lbs</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 15,
  },
  todayButton: {
    backgroundColor: '#2ecc71',
    paddingVertical: 10,
    marginVertical: 15,
    borderRadius: 25,
    alignSelf: 'center',
    paddingHorizontal: 25,
  },
  todayButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  calendarTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2d3436',
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  scrollContainer: {
    padding: 20,
  },
  loadingText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 20,
    fontSize: 16,
  },
  summaryContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2d3436',
    marginBottom: 15,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2ecc71',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  exerciseCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2d3436',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2d3436',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  setsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 15,
  },
  setItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    padding: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  setNumber: {
    color: '#666',
    fontWeight: '500',
  },
  setDetail: {
    color: '#2d3436',
    fontWeight: '500',
  },
});

export default CalendarScreen;
