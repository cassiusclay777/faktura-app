import { render, screen } from '@testing-library/react';
import AppHeader from './AppHeader';
import { TabType } from '@/components/wizard/WizardTabs';

describe('AppHeader', () => {
  const mockProps = {
    currentTab: 'upload' as TabType,
    onTabChange: jest.fn(),
  };

  it('renders the application title', () => {
    render(<AppHeader {...mockProps} />);
    
    expect(screen.getByText('Faktura z podkladu')).toBeInTheDocument();
  });

  it('renders the application description', () => {
    render(<AppHeader {...mockProps} />);
    
    expect(screen.getByText('Podklad → řádky → náhled / tisk (bez iDoklad API)')).toBeInTheDocument();
  });

  it('renders WizardTabs component', () => {
    render(<AppHeader {...mockProps} />);
    
    // Check if WizardTabs is rendered (it should have navigation with buttons)
    expect(screen.getByRole('navigation')).toBeInTheDocument();
    expect(screen.getByText('1. Podklad')).toBeInTheDocument();
    expect(screen.getByText('2. Faktura')).toBeInTheDocument();
    expect(screen.getByText('3. Náhled')).toBeInTheDocument();
  });

  it('accepts custom title and subtitle', () => {
    const customProps = {
      ...mockProps,
      title: 'Custom Title',
      subtitle: 'Custom Subtitle',
    };
    
    render(<AppHeader {...customProps} />);
    
    expect(screen.getByText('Custom Title')).toBeInTheDocument();
    expect(screen.getByText('Custom Subtitle')).toBeInTheDocument();
  });
});