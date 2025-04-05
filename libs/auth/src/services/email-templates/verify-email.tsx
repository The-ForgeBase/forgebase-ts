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

interface VerifyEmailProps {
  url: string;
  username?: string;
  expiryText?: string;
}

export const VerifyEmailTemplate = ({
  url,
  username = 'there',
  expiryText = '24 hours',
}: VerifyEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Verify your email address</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={header}>Email Verification</Heading>

          <Section style={section}>
            <Text style={greeting}>Hello {username}!</Text>
            <Text style={paragraph}>
              Thank you for signing up. To complete your registration and verify
              your email address, please click the button below:
            </Text>

            <Section style={buttonContainer}>
              <Button href={url} style={button} height={0} width={0}>
                Verify My Email
              </Button>
            </Section>

            <Text style={paragraph}>
              If the button doesn't work, you can also copy and paste this link
              into your browser:
            </Text>
            <Text style={link}>{url}</Text>

            <Text style={paragraph}>
              This verification link will expire in {expiryText}. If you didn't
              create an account, please ignore this email.
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
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
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
