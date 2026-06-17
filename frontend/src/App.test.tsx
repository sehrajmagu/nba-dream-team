import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders conference select screen', () => {
  render(<App />);
  const title = screen.getByText(/choose your path/i);
  expect(title).toBeInTheDocument();
});
