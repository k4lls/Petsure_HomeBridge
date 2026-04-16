'use strict';

const BaseAccessory = require('./BaseAccessory');

class OccupancySensorAccessory extends BaseAccessory {
  constructor(log, accessory, device, session, occupancyFlipped) {
    super(log, accessory, device, session);

    this.sensor = device;
    this.occupancyFlipped = occupancyFlipped;

    this.service = this.accessory.getService(global.Service.OccupancySensor);
    this.service
      .getCharacteristic(global.Characteristic.OccupancyDetected)
      .on('get', this.getOccupancy.bind(this));

    this.setReachable();
  }

  pollStatus(data) {
    const pets = data && data.data && Array.isArray(data.data.pets) ? data.data.pets : [];

    for (const pet of pets) {
      if (String(pet.id) !== String(this.sensor.id)) {
        continue;
      }

      const occupancy = this.translatePosition(pet);
      if (occupancy === null) {
        return;
      }

      this.service
        .getCharacteristic(global.Characteristic.OccupancyDetected)
        .setValue(occupancy);

      return;
    }
  }

  getOccupancy(callback) {
    this.session.getStatuses((data) => {
      if (!data || !data.data || !Array.isArray(data.data.pets)) {
        callback(new Error('Unable to load Sure Petcare pet occupancy.'));
        return;
      }

      for (const pet of data.data.pets) {
        if (String(pet.id) !== String(this.sensor.id)) {
          continue;
        }

        const occupancy = this.translatePosition(pet);
        callback(null, occupancy === null ? 0 : occupancy);
        return;
      }

      callback(null, 0);
    });
  }

  translatePosition(pet) {
    if (!pet.position || pet.position.where === undefined) {
      return null;
    }

    let occupancy = pet.position.where === 2 ? 0 : 1;

    if (this.occupancyFlipped) {
      occupancy = occupancy === 1 ? 0 : 1;
    }

    return occupancy;
  }
}

module.exports = OccupancySensorAccessory;
