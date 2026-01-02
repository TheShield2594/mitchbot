const { runCommandOperation } = require('./utils/commandRunner');

const deploy = async () => {
  await runCommandOperation({ throwOnError: true });
};

// Run if called directly
if (require.main === module) {
  deploy();
}

module.exports = deploy;
