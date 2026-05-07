'use strict';

const { SurePetcareApi } = require('./lib/PetSureApi');
const PetFlapAccessory = require('./accessories/PetFlapAccessory');
const OccupancySensorAccessory = require('./accessories/OccupancySensorAccessory');

const PLUGIN_NAME = 'homebridge-petsure';
const PLATFORM_NAME = 'PetSure';

let Accessory;
let Service;
let Characteristic;
let UUIDGen;

module.exports = (homebridge) => {
  Accessory = homebridge.platformAccessory;
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  UUIDGen = homebridge.hap.uuid;

  global.Accessory = Accessory;
  global.Service = Service;
  global.Characteristic = Characteristic;

  homebridge.registerPlatform(PLUGIN_NAME, PLATFORM_NAME, PetSurePlatform, true);
};

class PetSurePlatform {
  constructor(log, config, api) {
    this.log = log;
    this.config = config || {};
    this.api = api;
    this.accessories = {};
    this.pollTimer = null;
    this.petcareApi = null;

    if (!api) {
      return;
    }

    api.on('didFinishLaunching', () => {
      this.petcareApi = new SurePetcareApi({
        email_address: this.config.email,
        password: this.config.password,
        device_id: UUIDGen.generate(this.config.email || PLATFORM_NAME),
        log: this.log
      });

      this.petcareApi.getStatuses((data) => {
        if (!this.isValidStatusPayload(data)) {
          this.log.error('Unable to load Sure Petcare devices during startup.');
        } else {
          this.syncAccessories(data);
        }

        this.schedulePoll();
      });
    });
  }

  configureAccessory(accessory) {
    this.accessories[accessory.UUID] = accessory;
  }

  schedulePoll() {
    const intervalSeconds = Number(this.config.poll_interval) || 30;
    const interval = Math.max(intervalSeconds, 5) * 1000;

    if (this.pollTimer !== null) {
      clearTimeout(this.pollTimer);
    }

    this.pollTimer = setTimeout(() => {
      this.pollStatus();
    }, interval);
  }

  pollStatus() {
    if (!this.petcareApi) {
      this.schedulePoll();
      return;
    }

    this.petcareApi.getStatuses((data) => {
      if (this.isValidStatusPayload(data)) {
        this.syncAccessories(data);

        for (const uuid in this.accessories) {
          const accessory = this.accessories[uuid];
          if (accessory && typeof accessory.pollStatus === 'function') {
            accessory.pollStatus(data);
          }
        }
      }

      this.schedulePoll();
    });
  }

  isValidStatusPayload(data) {
    return !!(data && data.data);
  }

  syncAccessories(data) {
    const devices = Array.isArray(data.data.devices) ? data.data.devices : [];
    for (const device of devices) {
      this.addDevice(device);
    }

    if (this.config.pet_occupancy) {
      const pets = Array.isArray(data.data.pets) ? data.data.pets : [];
      for (const pet of pets) {
        this.addPet(pet);
      }
    }
  }

  addDevice(device) {
    if (this.config.enable_flap === false) {
      return;
    }

    if (![3, 6].includes(device.product_id)) {
      return;
    }

    const uuidSource = device.serial_number || device.mac_address;
    if (!uuidSource) {
      return;
    }

    const uuid = UUIDGen.generate(uuidSource);
    const existing = this.accessories[uuid];

    if (!existing) {
      this.registerPetFlap(device, uuid);
      return;
    }

    if (existing instanceof PetFlapAccessory) {
      return;
    }

    this.accessories[uuid] = new PetFlapAccessory(
      this.log,
      existing,
      device,
      this.petcareApi,
      this.config
    );
  }

  addPet(pet) {
    const uuid = UUIDGen.generate(`PET-${pet.id}`);
    const existing = this.accessories[uuid];
    const occupancyFlipped = !!this.config.occupancy_flipped;

    if (!existing) {
      this.registerOccupancySensor(pet, uuid, occupancyFlipped);
      return;
    }

    if (existing instanceof OccupancySensorAccessory) {
      return;
    }

    this.accessories[uuid] = new OccupancySensorAccessory(
      this.log,
      existing,
      pet,
      this.petcareApi,
      occupancyFlipped
    );
  }

  registerPetFlap(device, uuid) {
    const name = device.name || 'Pet Door';
    const accessory = new Accessory(name, uuid);

    accessory.addService(Service.LockMechanism);

    this.accessories[uuid] = new PetFlapAccessory(
      this.log,
      accessory,
      device,
      this.petcareApi,
      this.config
    );

    this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
  }

  registerOccupancySensor(pet, uuid, occupancyFlipped) {
    const name = pet.name || 'Pet Occupancy';
    const accessory = new Accessory(name, uuid);

    accessory.addService(Service.OccupancySensor);

    this.accessories[uuid] = new OccupancySensorAccessory(
      this.log,
      accessory,
      pet,
      this.petcareApi,
      occupancyFlipped
    );

    this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
  }
}
