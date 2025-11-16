const { sendAllRegionalAdvanceForecasts } = require("./advance-webhook");

console.log("=".repeat(50));
console.log("Testing Advance Weather Forecast Webhook");
console.log("=".repeat(50));

sendAllRegionalAdvanceForecasts();
