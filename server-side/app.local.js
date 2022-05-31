"use strict";
exports.__esModule = true;
var debug_server_1 = require("@pepperi-addons/debug-server");
var addon_config_json_1 = require("../addon.config.json");
var dir = __dirname;
var server = new debug_server_1.DebugServer({
    addonUUID: addon_config_json_1["default"].AddonUUID,
    apiDirectory: dir,
    port: addon_config_json_1["default"].DebugPort
});
// serve the plugin file locally
server.addStaticFolder("/assets/plugins/" + addon_config_json_1["default"].AddonUUID + "/" + addon_config_json_1["default"].AddonVersion, process.cwd() + '/../publish/editors');
server.addStaticFolder("/", process.cwd() + '/../publish/editors');
// serve the plugin assets locally
server.addStaticFolder("/Addon/Public/" + addon_config_json_1["default"].AddonUUID + "/" + addon_config_json_1["default"].AddonVersion, process.cwd() + '/../publish/assets');
server.addStaticFolder("/assets/plugins/" + addon_config_json_1["default"].AddonUUID + "/" + addon_config_json_1["default"].AddonVersion, process.cwd() + '/../publish/assets');
server.start();
console.log("Open webapp at: ", addon_config_json_1["default"].WebappBaseUrl + "/settings/" + addon_config_json_1["default"].AddonUUID + "/" + addon_config_json_1["default"].DefaultEditor + "?dev=true");
