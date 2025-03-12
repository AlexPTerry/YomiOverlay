
// Possibly use the below instead of nutjs sleep if I never use anything else from it!
module.exports.sleep = function(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}