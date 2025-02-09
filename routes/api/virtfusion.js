var express = require("express");
var router = express.Router();
require('dotenv').config()
const https = require('https');

const { URLSearchParams } = require("url");
const EventEmitter = require("events");
const { hostname } = require("os");

const agent = new https.Agent({
    rejectUnauthorized: false // Disables SSL verification
});

/**
 * @description - This class contains some the actions supported by Virtfusion API
 * @class Actions
 * @static
 * @readonly
 * @memberof VirtfusionAdmin
 * @enum {string}
 */

/**
 * @class VirtfusionAdmin
 * @description - This class is used to make http requests to Virtfusion API
 * @param {String} host - Hostname of the Virtfusion server (IP or domain)
 * @param {String} port - Port of the Virtfusion server (default: 4085)
 * @param {String} adminapikey - API admin api key
 * @param {String} adminapipass - API admin api pass
 * @param {Boolean} isRawResponse - If true, the response will be the raw response from the API, Recommended to set this to false
 * @returns {VirtfusionAdmin} VirtfusionClient
 */

class VirtfusionAdmin extends EventEmitter {
    constructor({ host, adminapikey, isRawResponse = false }) {
        super();
        this.host = host;
        this.port = 443;
        this.adminapikey = adminapikey;
    }

    buildQueryString(params) {
        params.api = "json";
        Object.keys(params).forEach((key) => {
            if (params[key] === undefined) {
                delete params[key];
            }
        });
        const queryParams = new URLSearchParams(params);
        return `?${queryParams.toString()}`;
    }

    makeHttpRequest(path, method, postData) {
        const options = {
            hostname: this.host,
            port: this.port,
            path: path,
            method: method,
            headers: {
                'Authorization': `Bearer ${this.adminapikey}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(JSON.stringify(postData)) // Ensure the content length is correct
            },
        };

        return new Promise((resolve, reject) => {

            const data = JSON.stringify(postData); // Convert the data to JSON string
            const req = https.request(options, (res) => {
                let responseData = '';

                res.on('data', (chunk) => {
                    responseData += chunk;
                });
                res.on("end", () => {
                    try {
                        const parsedData = JSON.parse(responseData);
                        resolve(parsedData);
                    } catch (error) {
                        reject(error);
                    }
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            // Write the data to the request body
            req.write(data);

            // End the request
            req.end();
        });
    }

    async PreformRequest(data, method) {
        try {
            const res = await Promise.resolve(this.makeHttpRequest(data.path, method, data));

            if (res.error) {
                if (res.error[0]) {
                    throw res
                }
            }

            return Promise.resolve(res);
        } catch (err) {
            return Promise.reject(err);
        }
    }

    async CreateUser(data) {
        return await this.PreformRequest({ path: '/api/v1/users', ...data }, "POST")
    }
    async CreateServer(data) {
        return await this.PreformRequest({ path: '/api/v1/servers', ...data }, "POST")
    }
    async GetServer(data) {
        return await this.PreformRequest({ path: `/api/v1/servers/${data.serverId}` }, "GET")
    }

    async GetPackages(data) {
        return await this.PreformRequest({ path: '/api/v1/packages', ...data }, "GET")
    }

    async GetPackage(data) {
        return await this.PreformRequest({ path: `/api/v1/packages/${data.id}`, ...data }, "GET")
    }
}

router.VirAdmin = new VirtfusionAdmin({
    host: process.env.virDomin,
    adminapikey: process.env.virApi,
})




// text = async() => {
//     const server = await router.VirAdmin.CreateServer({
//         packageId: 4,
//         userId: 27,
//         hypervisorId: 1,
//         ipv4: 1,
//         storage: 20,
//         traffic: 0,
//         memory: 1024,
//         cpuCores: 2,
//         networkSpeedInbound: 0,
//         networkSpeedOutbound: 0,
//     })

//     console.log(server)
// }
// text()

// text = async() => {
//     const server = await router.VirAdmin.GetServer({
//         serverId: 46,
//     })

//     console.log(server)
// }
// text()

module.exports = router;