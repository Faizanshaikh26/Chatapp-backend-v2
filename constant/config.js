exports.corsOptions = {
  origin: [process.env.ORIGIN],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
};
