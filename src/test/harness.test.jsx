import { screen } from '@testing-library/react'
import { renderWithProviders } from './renderWithProviders'

test('the test harness renders inside the application providers', () => {
  renderWithProviders(<p>harness</p>)
  expect(screen.getByText('harness')).toBeInTheDocument()
})
