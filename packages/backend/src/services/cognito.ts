import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  ConfirmSignUpCommand,
  InitiateAuthCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
  ResendConfirmationCodeCommand,
  AuthFlowType,
} from '@aws-sdk/client-cognito-identity-provider';
import type { AuthTokens } from '@cv-coach/shared';

/**
 * Wrapper cho Amazon Cognito Identity Provider.
 *
 * Dùng USER_PASSWORD_AUTH flow (client không có secret — SPA public client).
 */
export class CognitoService {
  private client: CognitoIdentityProviderClient;
  private clientId: string;

  constructor(region: string, clientId: string) {
    this.client = new CognitoIdentityProviderClient({ region });
    this.clientId = clientId;
  }

  async register(email: string, password: string, fullName: string): Promise<void> {
    await this.client.send(
      new SignUpCommand({
        ClientId: this.clientId,
        Username: email,
        Password: password,
        UserAttributes: [
          { Name: 'email', Value: email },
          { Name: 'name', Value: fullName },
        ],
      }),
    );
  }

  async confirmSignUp(email: string, code: string): Promise<void> {
    await this.client.send(
      new ConfirmSignUpCommand({
        ClientId: this.clientId,
        Username: email,
        ConfirmationCode: code,
      }),
    );
  }

  async resendCode(email: string): Promise<void> {
    await this.client.send(
      new ResendConfirmationCodeCommand({
        ClientId: this.clientId,
        Username: email,
      }),
    );
  }

  async login(email: string, password: string): Promise<AuthTokens> {
    const result = await this.client.send(
      new InitiateAuthCommand({
        ClientId: this.clientId,
        AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password,
        },
      }),
    );

    const auth = result.AuthenticationResult;
    if (!auth?.AccessToken || !auth.IdToken || !auth.RefreshToken) {
      throw new Error('Authentication failed: no tokens returned');
    }

    return {
      accessToken: auth.AccessToken,
      idToken: auth.IdToken,
      refreshToken: auth.RefreshToken,
      expiresIn: auth.ExpiresIn ?? 3600,
    };
  }

  async forgotPassword(email: string): Promise<void> {
    await this.client.send(
      new ForgotPasswordCommand({
        ClientId: this.clientId,
        Username: email,
      }),
    );
  }

  async confirmForgotPassword(
    email: string,
    code: string,
    newPassword: string,
  ): Promise<void> {
    await this.client.send(
      new ConfirmForgotPasswordCommand({
        ClientId: this.clientId,
        Username: email,
        ConfirmationCode: code,
        Password: newPassword,
      }),
    );
  }
}
