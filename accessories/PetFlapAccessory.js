'use strict';

const BaseAccessory = require('./BaseAccessory');

class PetFlapAccessory extends BaseAccessory {
  constructor(log, accessory, device, session, config) {
    super(log, accessory, device, session);

    this.lock = device;
    this.config = config || {};

    this.service = this.accessory.getService(global.Service.LockMechanism);

    this.service
      .getCharacteristic(global.Characteristic.LockCurrentState)
      .on('get', this.getLockState.bind(this));

    this.service
      .getCharacteristic(global.Characteristic.LockTargetState)
      .on('set', this.setLockState.bind(this))
      .on('get', this.getLockState.bind(this));

    this.battery = this.accessory.getService(global.Service.BatteryService);
    if (!this.battery) {
      this.battery = this.accessory.addService(global.Service.BatteryService);
    }

    this.battery
      .getCharacteristic(global.Characteristic.BatteryLevel)
      .on('get', this.getBatteryLevel.bind(this));

    this.battery
      .getCharacteristic(global.Characteristic.ChargingState)
      .on('get', this.getBatteryChargeState.bind(this));

    this.battery
      .getCharacteristic(global.Characteristic.StatusLowBattery)
      .on('get', this.getBatteryLowLevel.bind(this));

    this.setReachable();
  }

  pollStatus(data) {
    const devices = data && data.data && Array.isArray(data.data.devices) ? data.data.devices : [];

    for (const device of devices) {
      if (String(device.id) !== String(this.lock.id) || !device.status || !device.status.locking) {
        continue;
      }

      const state = device.status.locking.mode >= 1 ? 1 : 0;

      this.service
        .getCharacteristic(global.Characteristic.LockTargetState)
        .setValue(state, null, 'internal');

      this.service
        .getCharacteristic(global.Characteristic.LockCurrentState)
        .setValue(state, null, 'internal');

      return;
    }
  }

  getLockState(callback) {
    this.session.getLockStatus(this.lock.id, (data) => {
      if (!data || !data.status || !data.status.locking) {
        callback(new Error('Unable to load Sure Petcare lock status.'));
        return;
      }

      callback(null, data.status.locking.mode > 0);
    });
  }

  setLockState(targetState, callback, context) {
    if (context === 'internal') {
      callback(null);
      return;
    }

    let lockMode = targetState;
    if (targetState !== 0) {
      lockMode = this.config.lock_mode || targetState;
    }

    this.session.setLock(this.lock.id, lockMode, (data) => {
      if (!data) {
        callback(new Error('Unable to update Sure Petcare lock state.'));
        return;
      }

      this.service
        .getCharacteristic(global.Characteristic.LockCurrentState)
        .setValue(targetState, null, 'internal');

      callback(null);
    });
  }

  getBatteryLevel(callback) {
    this.session.getLockStatus(this.lock.id, (data) => {
      if (!data || !data.status) {
        callback(new Error('Unable to load Sure Petcare battery level.'));
        return;
      }

      callback(null, this.session.translateBatteryToPercent(data.status.battery));
    });
  }

  getBatteryChargeState(callback) {
    callback(null, 2);
  }

  getBatteryLowLevel(callback) {
    this.session.getLockStatus(this.lock.id, (data) => {
      if (!data || !data.status) {
        callback(new Error('Unable to load Sure Petcare battery level.'));
        return;
      }

      const battery = this.session.translateBatteryToPercent(data.status.battery);
      callback(null, battery <= 25 ? 1 : 0);
    });
  }
}

module.exports = PetFlapAccessory;
