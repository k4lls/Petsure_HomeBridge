'use strict';

class BaseAccessory {
  constructor(log, accessory, device, session) {
    this.accessory = accessory;
    this.log = log;
    this.session = session;
    this.deviceId = device.id;

    const infoService = accessory.getService(global.Service.AccessoryInformation);

    accessory.context.manufacturer = 'Sure Petcare';
    infoService.setCharacteristic(global.Characteristic.Manufacturer, accessory.context.manufacturer);

    if (device.product_id === undefined || device.gender !== undefined) {
      accessory.context.model = 'Pet';
      accessory.context.serial = String(device.id);
      accessory.context.revision = '1';
    } else {
      accessory.context.model = String(device.product_id || 'Sure Petcare');
      accessory.context.serial = String(device.serial_number || device.mac_address || device.id);
      accessory.context.revision = String(device.version || '1');
    }

    if (accessory.context.model.length < 2) {
      accessory.context.model = `Model ${accessory.context.model}`;
    }

    infoService.setCharacteristic(global.Characteristic.Model, accessory.context.model);
    infoService.setCharacteristic(global.Characteristic.SerialNumber, accessory.context.serial);
    infoService.setCharacteristic(global.Characteristic.FirmwareRevision, accessory.context.revision);
  }

  setReachable() {
    if (typeof this.accessory.updateReachability === 'function') {
      this.accessory.updateReachability(true);
    }
  }
}

module.exports = BaseAccessory;
