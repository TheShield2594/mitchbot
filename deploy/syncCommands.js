const { runCommandOperation } = require('./utils/commandRunner');

const sync = async () => {
  await runCommandOperation({ throwOnError: false });
};

if (require.main === module) {
  sync();
}

module.exports = sync;
