import 'dotenv/config';
import * as joi from 'joi';

interface EnvVars {
  PORT: number;
  // PRODUCTS_SERVICE_HOST: string;
  // PRODUCTS_SERVICE_PORT: number;
  NATS_SERVERS: string[];
}

const envsSchema = joi
  .object({
    PORT: joi.number().required(),
    // PRODUCTS_SERVICE_HOST: joi.string().required(),
    // PRODUCTS_SERVICE_PORT: joi.number().required(),
    NATS_SERVERS: joi.array().items(joi.string()).required(),
  })
  .unknown(true);

const { error, value } = envsSchema.validate({
  ...process.env,
  NATS_SERVERS: process.env.NATS_SERVERS?.split(','), // Split the NATS_SERVERS string into an array of strings to validate it as an array of strings
});

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

const envVars: EnvVars = value;

export const envs = {
  port: envVars.PORT,
  // productsMicroservice: {
  //   host: envVars.PRODUCTS_SERVICE_HOST,
  //   port: envVars.PRODUCTS_SERVICE_PORT,
  // },
  natsServers: envVars.NATS_SERVERS,
};
