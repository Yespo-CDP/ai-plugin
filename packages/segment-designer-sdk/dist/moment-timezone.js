import moment from "./moment-timezone-runtime.js";
import data from "./timezone-data.js";
moment.tz.load(data);
export default moment;
