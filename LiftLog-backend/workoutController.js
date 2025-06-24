const db = require('./firebase');

const workoutCollection = db.collection('workouts');

//CRUD operations (create, read, update, delete)

async function addWorkout(workoutData) {
  try {
    const docRef = await workoutCollection.add(workoutData);
    console.log('Workout added:', docRef.id);
  } catch (error) {
    console.error('Error adding workout:', error);
  }
}

async function getAllWorkouts() {
  try {
    const querySnapshot = await workoutCollection.get();
    const workouts = querySnapshot.docs.map(doc => doc.data());
    return workouts;
  } catch (error) {
    console.error('Error fetching workouts:', error);
  }
}

async function updateWorkout(workoutId, updatedData) {
  try {
    await workoutCollection.doc(workoutId).update(updatedData);
    console.log('Workout updated:', workoutId);
  } catch (error) {
    console.error('Error updating workout:', error);
  }
}

async function deleteWorkout(workoutId) {
  try {
    await workoutCollection.doc(workoutId).delete();
    console.log('Workout deleted:', workoutId);
  } catch (error) {
    console.error('Error deleting workout:', error);
  }
}

module.exports = {
  addWorkout,
  getAllWorkouts,
  updateWorkout,
  deleteWorkout,
};
