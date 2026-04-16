# homebridge-sure-petcare-platform

Enables Sure Petcare products (currently pet and cat doors, plus optional pet occupancy sensors) to work with HomeKit through Homebridge.

Version `0.2.0` removes the deprecated `sure_petcare` and `request` dependency chain and uses Node's built-in `fetch`, which is a much better fit for modern runtimes including `Node.js 24.15.0`.

To install:

    npm install -g homebridge-sure-petcare-platform

To configure, add this to your homebridge config.json file:
    
    
    "platforms": [
        {
            "platform": "SurePetcare",
            "email": "your_email@email.com",
            "password": "your_password",
            "poll_interval": 30,
            "pet_occupancy": true,
            "occupancy_flipped": true,
            "lock_mode": 1
        }
    ]

### Note:
#### poll_interval (optional) 
If poll_interval it is not defined in the config it will default to 30. Adjusting this number will lengthen or shorten the amount of time between status checks for each accessory. I would recommend keeping this to above 5 seconds, but feel free to adjust this to your liking.

#### pet_occupancy (optional)
pet_occupancy will default to false. If this is true it will enable an occupancy sensor for each of your pets. During each "poll interval" the occupancy sensor will be updated to reflect if the app says the pet is inside or outside the house. "Occupancy Detected" means they are inside the house, "No Occupancy" means they are outside the house.

#### occupancy_flipped (optional)
occupancy_flipped will default to false. If you set this to true, the occupancy sensors state will be flipped. This means if your pet is outside, the sensor will read "occupancy detected". If a pet is inside the house occupancy will not be detected.

#### lock_mode (optional)
lock_mode will default to 1 if not defined. You can change this value based on the locking mode you want. The different modes are:
* 1 (default) - Keeps your pets inside the house, but will let them enter from outside.
* 2 - Keeps your pets outside the house, but will let them go outside. (keeps dead lizards and mice out)
* 3 - Locks the door in both directions. No one in, no one out. (keeps lizards and mice alive and from dying and being brought in)

## Runtime support
* Node.js `18+`
* Homebridge `1.6+`

## Supports:
* Cat Door Connect
* Pet Door Connect

## Change Log:
### 0.2.0 - Apr. 16, 2026
* Replaced the deprecated `sure_petcare` dependency with a native fetch-based Sure Petcare client.
* Fixed startup polling races that could cause `acc.pollStatus is not a function`.
* Fixed accessory inheritance so cached accessories are rehydrated more reliably.
* Updated package metadata and documented current Node/Homebridge support.

### 0.1.4 - Oct. 6, 2020
* Wired in lock_mode to actually work becuase who needs to test code you write?

### 0.1.3 - Oct. 6, 2020
* Added lock_mode support to specify how the pet doors would lock from homekit.
