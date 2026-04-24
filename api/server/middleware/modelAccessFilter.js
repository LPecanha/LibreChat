const mongoose = require('mongoose');
const { logger } = require('@librechat/data-schemas');

const SCHEMA = new mongoose.Schema(
  { userId: { type: String, index: true }, effectiveBlockedSpecs: [String], agentsDisabled: Boolean },
  { collection: 'ext_user_model_access', strict: false },
);

let _extConn = null;

function getExtConnection() {
  if (_extConn) return _extConn;
  const uri = process.env.EXT_MONGO_URI;
  if (uri) {
    _extConn = mongoose.createConnection(uri);
  }
  return _extConn;
}

function getModel() {
  const conn = getExtConnection();
  if (conn) {
    return conn.models['ExtUserModelAccess'] ?? conn.model('ExtUserModelAccess', SCHEMA);
  }
  return mongoose.models['ExtUserModelAccess'] ?? mongoose.model('ExtUserModelAccess', SCHEMA);
}

async function getBlockedSpecs(userId) {
  try {
    const doc = await getModel().findOne({ userId: userId.toString() }).lean();
    return { blocked: doc?.effectiveBlockedSpecs ?? [], agentsDisabled: doc?.agentsDisabled ?? false };
  } catch (err) {
    logger.error('[modelAccessFilter] getBlockedSpecs error', { err });
    return { blocked: [], agentsDisabled: false };
  }
}

module.exports = async function modelAccessFilter(req, res, next) {
  if (req.method !== 'GET' || !req.user?.id) return next();

  const { blocked, agentsDisabled } = await getBlockedSpecs(req.user.id);
  if (blocked.length === 0 && !agentsDisabled) return next();

  const originalJson = res.json.bind(res);
  res.json = function (data) {
    if (data?.modelSpecs?.list && blocked.length > 0) {
      data.modelSpecs.list = data.modelSpecs.list.filter((s) => !blocked.includes(s.name));
    }
    if (agentsDisabled && data?.modelSpecs?.addedEndpoints) {
      data.modelSpecs.addedEndpoints = data.modelSpecs.addedEndpoints.filter((e) => e !== 'agents');
    }
    return originalJson(data);
  };

  next();
};
