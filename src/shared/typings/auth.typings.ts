export interface AuthorizedRequest extends Request {
  user: {
    userId: string;
  };
  token: string;
}

export interface Token {
  user: {
    userId: string;
  };
  token: string;
}
