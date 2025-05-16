import * as React from 'react';
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Hr,
  Preview,
  Section,
  Text,
} from 'jsx-email';

interface ResetPasswordEmailProps {
  url: string;
  username?: string;
}

export const ResetPasswordEmail = ({
  url,
  username = 'there',
}: ResetPasswordEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Reset your password</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={header}>Password Reset</Heading>

          <Section style={section}>
            <Text style={greeting}>Hello {username}!</Text>
            <Text style={paragraph}>
              We received a request to reset your password. If you didn't make
              this request, you can safely ignore this email.
            </Text>
            <Text style={paragraph}>
              To reset your password, please click the button below:
            </Text>

            <Section style={buttonContainer}>
              <Button href={url} style={button} height={0} width={100}>
                Reset Password
              </Button>
            </Section>

            <Text style={paragraph}>
              If the button doesn't work, you can also copy and paste this link
              into your browser:
            </Text>
            <Text style={link}>{String(url)}</Text>

            <Text style={paragraph}>
              This password reset link will expire in 1 hour for security
              reasons.
            </Text>
          </Section>

          <Hr style={divider} />

          <Text style={footer}>
            © {new Date().getFullYear()} Your Company. All rights reserved.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

const main = {
  backgroundColor: '#f5f5f5',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '40px 20px',
  backgroundColor: '#ffffff',
  borderRadius: '5px',
  maxWidth: '600px',
};

const header = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  textAlign: 'center' as const,
  margin: '10px 0 30px',
};

const section = {
  padding: '0 30px',
};

const greeting = {
  fontSize: '18px',
  lineHeight: '1.5',
  color: '#333',
  fontWeight: 'bold',
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '1.5',
  color: '#444',
  margin: '16px 0',
};

const buttonContainer = {
  margin: '30px 0',
  textAlign: 'center' as const,
};

const button = {
  backgroundColor: '#0070f3',
  borderRadius: '5px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 30px',
};

const link = {
  color: '#0070f3',
  textDecoration: 'none',
  fontSize: '14px',
  wordBreak: 'break-all' as const,
};

const divider = {
  borderColor: '#eaeaea',
  margin: '30px 0',
};

const footer = {
  color: '#666',
  fontSize: '12px',
  textAlign: 'center' as const,
};
