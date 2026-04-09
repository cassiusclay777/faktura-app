import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DropZone from './DropZone';

describe('DropZone', () => {
  const mockOnFile = jest.fn();
  const defaultProps = {
    onFile: mockOnFile,
    accept: '.txt,.pdf,.jpg,.jpeg,.png',
  };

  beforeEach(() => {
    mockOnFile.mockClear();
  });

  it('renders drop zone with correct text', () => {
    render(<DropZone {...defaultProps} />);
    
    expect(screen.getByText('Přetáhni soubor nebo klikni pro výběr')).toBeInTheDocument();
    expect(screen.getByText('.txt, .pdf, JPEG, PNG, WebP, GIF')).toBeInTheDocument();
  });

  it('shows file input with correct accept attribute', () => {
    render(<DropZone {...defaultProps} />);
    
    // File input is hidden, find it in the DOM
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();
    expect(fileInput).toHaveAttribute('accept', '.txt,.pdf,.jpg,.jpeg,.png');
  });

  it('changes text when dragging', () => {
    render(<DropZone {...defaultProps} />);
    
    // Initially shows normal text
    expect(screen.getByText('Přetáhni soubor nebo klikni pro výběr')).toBeInTheDocument();
    
    // Find the drop zone div (the main container)
    const dropZone = screen.getByText('Přetáhni soubor nebo klikni pro výběr').closest('div[class*="cursor-pointer"]');
    
    // Simulate drag enter with files
    if (dropZone) {
      fireEvent.dragEnter(dropZone, {
        dataTransfer: {
          items: [{ type: 'image/jpeg' }],
        },
      });
    }
    
    // Should show dragging text
    expect(screen.getByText('Pustit pro nahrání')).toBeInTheDocument();
  });

  it('handles file drop', () => {
    render(<DropZone {...defaultProps} />);
    
    const dropZone = screen.getByText('Přetáhni soubor nebo klikni pro výběr').closest('div[class*="cursor-pointer"]');
    const mockFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
    
    if (dropZone) {
      fireEvent.drop(dropZone, {
        dataTransfer: {
          files: [mockFile],
        },
      });
    }
    
    expect(mockOnFile).toHaveBeenCalledWith(mockFile);
  });

  it('handles file selection via input', async () => {
    const user = userEvent.setup();
    render(<DropZone {...defaultProps} />);
    
    // File input is hidden in the DOM
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    
    // Mock file input change
    await user.upload(fileInput, mockFile);
    
    expect(mockOnFile).toHaveBeenCalledWith(mockFile);
  });

  it('disables drop zone when disabled prop is true', () => {
    render(<DropZone {...defaultProps} disabled={true} />);
    
    const dropZone = screen.getByText('Přetáhni soubor nebo klikni pro výběr').closest('div[class*="cursor-pointer"]');
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    // Check classes on drop zone
    expect(dropZone?.className).toContain('opacity-50');
    expect(dropZone?.className).toContain('cursor-not-allowed');
    expect(fileInput).toBeDisabled();
  });
});