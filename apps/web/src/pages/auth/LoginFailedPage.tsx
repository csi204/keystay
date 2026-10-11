import React from 'react';
import { LoginPage } from './LoginPage';

export const LoginFailedPage: React.FC = () => {
  return <LoginPage initialFailed={true} />;
};
