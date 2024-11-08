export interface IConfigs {
  env: {
    nodeEnv: string;
    logLevel: string;
  };
  providers: {
    redis: {
      host: string;
      port: number;
      password: string;
      db: number;
      clusterMode: boolean;
    };
    aws: {
      region: string;
      accessKeyId: string;
      secretAccessKey: string;
      kmsKeyId: string;
    };
    elasticSearch: {
      node: string;
      userName: string;
      password: string;
      indexRecipes: string;
      indexIngredients: string;
    };
    rabbitmq: {
      url: string;
      heartBeat: number;
      prefetch: number;
      retryAttempts: number;
    };
  };
  workers: {
    queue: string;
    prefetch: number;
    maxRetries: number;
    retryDelay: number;
  };
}
