'use strict';

const API_BASE_URL = 'https://app.api.surehub.io/api';
const AUTH_URL = `${API_BASE_URL}/auth/login`;
const START_URL = `${API_BASE_URL}/me/start`;
const DEVICE_CONTROL_URL = `${API_BASE_URL}/device/%s/control`;

const BATTERY_VOLTAGE_FULL = 1.6;
const BATTERY_VOLTAGE_LOW = 1.2;
const BATTERY_VOLTAGE_DIFF = BATTERY_VOLTAGE_FULL - BATTERY_VOLTAGE_LOW;

function formatString(template, value) {
  return template.replace('%s', value);
}

function createError(message, status, body) {
  const error = new Error(message);
  if (status !== undefined) {
    error.status = status;
  }
  if (body !== undefined) {
    error.body = body;
  }
  return error;
}

class SurePetcareApi {
  constructor(options) {
    this.email = options.email_address;
    this.password = options.password;
    this.deviceId = options.device_id;
    this.log = options.log;
    this.token = null;
    this.requestTimeout = options.request_timeout || 15000;
    this.userAgent = options.user_agent || 'homebridge-petsure/1.0.0';
  }

  getStatuses(callback) {
    this.withCallback(() => this.getStatusesAsync(), callback);
  }

  getLockStatus(deviceId, callback) {
    this.withCallback(() => this.getLockStatusAsync(deviceId), callback);
  }

  setLock(deviceId, lockMode, callback) {
    this.withCallback(() => this.setLockAsync(deviceId, lockMode), callback);
  }

  translateBatteryToPercent(voltage) {
    if (typeof voltage !== 'number' || Number.isNaN(voltage)) {
      return 0;
    }

    if (voltage <= BATTERY_VOLTAGE_LOW) {
      return 0;
    }

    if (voltage >= BATTERY_VOLTAGE_FULL) {
      return 100;
    }

    return Math.round(((voltage - BATTERY_VOLTAGE_LOW) / BATTERY_VOLTAGE_DIFF) * 100);
  }

  withCallback(work, callback) {
    work()
      .then((result) => {
        try {
          callback(result);
        } catch (callbackError) {
          this.logError(callbackError);
        }
      })
      .catch((error) => {
        this.logError(error);
        try {
          callback(null);
        } catch (callbackError) {
          this.logError(callbackError);
        }
      });
  }

  logError(error) {
    if (this.log && typeof this.log.error === 'function') {
      this.log.error(error && error.stack ? error.stack : error);
      return;
    }

    console.error(error);
  }

  async getStatusesAsync() {
    return this.request('GET', START_URL);
  }

  async getLockStatusAsync(deviceId) {
    const data = await this.getStatusesAsync();
    const devices = data && data.data && Array.isArray(data.data.devices) ? data.data.devices : [];
    const device = devices.find((entry) => String(entry.id) === String(deviceId));

    if (!device) {
      throw createError(`Sure Petcare device not found: ${deviceId}`);
    }

    return device;
  }

  async setLockAsync(deviceId, lockMode) {
    const resource = formatString(DEVICE_CONTROL_URL, deviceId);
    return this.request('PUT', resource, {
      locking: lockMode
    });
  }

  async request(method, url, body, retrying) {
    if (!this.token) {
      await this.authenticate();
    }

    const response = await this.fetchJson(method, url, body);

    if (response.status === 401 && !retrying) {
      await this.authenticate(true);
      return this.request(method, url, body, true);
    }

    if (!response.ok) {
      const responseBody = await this.safeParseJson(response);
      throw createError(
        `Sure Petcare API request failed with status ${response.status}`,
        response.status,
        responseBody
      );
    }

    return this.safeParseJson(response);
  }

  async authenticate(forceRefresh) {
    if (!forceRefresh && this.token) {
      return this.token;
    }

    const response = await this.fetchJson(
      'POST',
      AUTH_URL,
      {
        email_address: this.email,
        password: this.password,
        device_id: this.deviceId
      },
      false
    );

    if (!response.ok) {
      const responseBody = await this.safeParseJson(response);
      throw createError(
        `Sure Petcare authentication failed with status ${response.status}`,
        response.status,
        responseBody
      );
    }

    const payload = await this.safeParseJson(response);
    const token = payload && payload.data ? payload.data.token : null;

    if (!token) {
      throw createError('Sure Petcare authentication response did not contain a token');
    }

    this.token = token;
    return token;
  }

  async fetchJson(method, url, body, includeAuth = true) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.requestTimeout);

    try {
      return await fetch(url, {
        method,
        headers: this.buildHeaders(includeAuth),
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal
      });
    } catch (error) {
      if (error && error.name === 'AbortError') {
        throw createError('Sure Petcare API request timed out');
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  buildHeaders(includeAuth) {
    const headers = {
      Host: 'app.api.surehub.io',
      Connection: 'keep-alive',
      'Content-Type': 'application/json',
      Accept: 'application/json, text/plain, */*',
      Origin: 'https://surepetcare.io',
      Referer: 'https://surepetcare.io',
      'Accept-Encoding': 'gzip, deflate',
      'Accept-Language': 'en-US,en-GB;q=0.9',
      'X-Requested-With': 'com.sureflap.surepetcare',
      'X-Device-Id': this.deviceId,
      'User-Agent': this.userAgent
    };

    if (includeAuth && this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    return headers;
  }

  async safeParseJson(response) {
    const text = await response.text();
    if (!text) {
      return null;
    }

    try {
      return JSON.parse(text);
    } catch (error) {
      throw createError('Sure Petcare API returned invalid JSON', response.status, text);
    }
  }
}

module.exports = {
  SurePetcareApi
};
