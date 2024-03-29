'use strict';

console.log(
  'Hello!, if you would like to reset the workouts just call app.reset()'
);

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  _setDescription() {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];
  #workoutLayerGroup = L.layerGroup(); // New layer group

  constructor() {
    // Get user's position
    this._getPosition();

    // Get data from local storage
    this._getLocalStorage();

    // Attach event handlers
    form.addEventListener('submit', this._netWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position.');
        }
      );
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;

    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);
    L.tileLayer('https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Handling clicks on map
    this.#map.on('click', this._showForm.bind(this));

    // Add layer group to map
    this.#workoutLayerGroup.addTo(this.#map);

    this.#workouts.forEach(work => {
      this._renderWorkout(work);
      this._renderWorkoutMarker(work);
    });
  }

  // _loadMap(position) {
  //   const { latitude, longitude } = position.coords;
  //   const coords = [latitude, longitude];

  //   this.#map = L.map('map').setView(coords, this.#mapZoomLevel);
  //   L.tileLayer('https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
  //     attribution:
  //       '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  //   }).addTo(this.#map);

  //   // Handling clicks on map
  //   this.#map.on('click', this._showForm.bind(this));

  //   // Add layer group to map
  //   this.#workoutLayerGroup.addTo(this.#map);

  //   // Render existing workouts on the map/UI
  //   this._getLocalStorage();

  //   this.#workouts.forEach(workout => {
  //     this._renderWorkoutMarker(workout);
  //     this._renderWorkout(workout);
  //   });
  // }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _netWorkout(e) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();

    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    if (type === 'running') {
      const cadence = +inputCadence.value;

      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs have to be positive numbers!');

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    if (type === 'cycling') {
      const elevation = +inputElevation.value;

      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Inputs have to be positive numbers!');

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    this.#workouts.push(workout);

    this._renderWorkoutMarker(workout);

    this._renderWorkout(workout);

    this._hideForm();

    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    const markerIconColer = L.icon({
      iconUrl: `${workout.type === 'running' ? 'green.png' : 'orange.png'}`,
      iconSize: [75, 85],
    });

    L.marker(workout.coords, { icon: markerIconColer })
      .addTo(this.#workoutLayerGroup) // Add to the layer group
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        ` ${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup().options.workoutId = workout.id; // Setting custom property
  }

  _renderWorkout(workout) {
    let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
      
      <div class="workout workout__topTitle">
      <div class="workout__title">${workout.description}</div>
      <div class="workout__close">❌</div>
    </div>

    <div class="workout__details-container">
      <div class="workout__details">
      <span class="workout__icon">${
        workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
      }</span>
      <span class="workout__value">${workout.distance}</span>
      <span class="workout__unit">km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⏱</span>
      <span class="workout__value">${workout.duration}</span>
      <span class="workout__unit">min</span>
    </div>`;

    if (workout.type === 'running')
      html += `
      <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.pace.toFixed(1)}</span>
          <span class="workout__unit">min/km</span>
       </div>
       <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
      </div>
      </div>
    </li>`;

    if (workout.type === 'cycling')
      html += `
      <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">km/h</span>
        </div>
      <div class="workout__details">
        <span class="workout__icon">⛰</span>
        <span class="workout__value">${workout.elevationGain}</span>
        <span class="workout__unit">m</span>
      </div>
      </div>
    </li>
      `;

    containerWorkouts.insertAdjacentHTML('beforeend', html);

    const closeWorkout = document.querySelector(
      `.workout[data-id="${workout.id}"] .workout__close`
    );
    closeWorkout.addEventListener('click', () => this.reset(workout.id));
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    if (workout && workout.coords) {
      this.#map.setView(workout.coords, this.#mapZoomLevel, {
        animate: true,
        pan: {
          duration: 1,
        },
      });
    }
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    this.#workouts = data;

    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  reset(workoutId) {
    // Remove the workout from the layer group
    const workoutMarker = this.#workoutLayerGroup
      .getLayers()
      .find(layer => layer.options.workoutId === workoutId);
    if (workoutMarker) {
      this.#workoutLayerGroup.removeLayer(workoutMarker);
    }

    // Remove the workout from the list of workouts
    this.#workouts = this.#workouts.filter(workout => workout.id !== workoutId);

    // Update the local storage
    this._setLocalStorage();

    // Remove the workout from the UI
    const workoutElement = document.querySelector(
      `.workout[data-id="${workoutId}"]`
    );
    if (workoutElement) {
      workoutElement.remove();
    }
  }
}

const app = new App();

// // // ==============
// // // This is a great example of using the rest operator ...
// // // This gives me validation through the helper functions at the top and allows me to make it dynamic
// // // ==============

// // // // ======  helper functions  ======

// // // // so this one checks if the input is a number
// // // const validInputs = (...inputs) => inputs.every(inp => Number.isFinite(inp));

// // // // this checks if the number is a positive number
// // // const allPositive = (...inputs) => inputs.every(inp => inp > 0);

// // // e.preventDefault();

// // // // Get data from form
// // // const type = inputType.value;
// // // const distance = +inputDistance.value;
// // // const duration = +inputDuration.value;

// // // // If workout is running, create running object
// // // if (type === 'running') {
// // //   const cadence = +inputCadence.value;
// // //   // Check if data is valid
// // //   if (
// // //     // !Number.isFinite(distance) ||
// // //     // !Number.isFinite(duration) ||
// // //     // !Number.isFinite(cadence)
// // //     !validInputs(distance, duration, cadence) ||
// // //     !allPositive(distance, duration, cadence)
// // //   )
// // //     return alert('Inputs have to be positive numbers!');
// // // }

// // // // If workout is cycling, create cycling object
// // // if (type === 'cycling') {
// // //   const elevation = +inputElevation.value;

// // //   if (
// // //     !validInputs(distance, duration, elevation) ||
// // //     !allPositive(distance, duration)
// // //   )
// // //     return alert('Inputs have to be positive numbers!');
// // // }
