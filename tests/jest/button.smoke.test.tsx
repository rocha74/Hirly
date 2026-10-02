import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Button } from '../../src/components/common/Button';

describe('common Button smoke test', () => {
  test('renders an accessible action and handles press', () => {
    const onPress = jest.fn();
    const screen = render(<Button label="Continuar" onPress={onPress} />);
    const button = screen.getByRole('button', { name: 'Continuar' });
    fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test('exposes disabled state and does not trigger', () => {
    const onPress = jest.fn();
    const screen = render(<Button label="Continuar" onPress={onPress} disabled />);
    const button = screen.getByRole('button', { name: 'Continuar', disabled: true });
    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });
});
