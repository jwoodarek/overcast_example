/**
 * Component Test: Card
 * 
 * Tests the Card component and its sub-components with React Testing Library
 * Validates rendering, styling, and composition patterns
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Card, { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/app/components/ui/Card';

describe('Card Component', () => {
  test('renders card', () => {
    render(<Card data-testid="card">Card Content</Card>);
    expect(screen.getByTestId('card')).toBeInTheDocument();
  });

  test('renders children correctly', () => {
    render(
      <Card>
        <div data-testid="child">Child Content</div>
      </Card>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  test('applies futuristic styling', () => {
    render(<Card data-testid="card">Content</Card>);
    const card = screen.getByTestId('card');
    expect(card).toHaveClass('bg-gray-900');
    expect(card).toHaveClass('border-gray-700');
  });

  test('has rounded corners', () => {
    render(<Card data-testid="card">Content</Card>);
    const card = screen.getByTestId('card');
    expect(card).toHaveClass('rounded-lg');
  });

  test('applies custom className', () => {
    render(<Card className="custom-card" data-testid="card">Content</Card>);
    const card = screen.getByTestId('card');
    expect(card).toHaveClass('custom-card');
  });
});

describe('CardHeader Component', () => {
  test('renders card header', () => {
    render(
      <Card>
        <CardHeader data-testid="header">Header Content</CardHeader>
      </Card>
    );
    expect(screen.getByTestId('header')).toBeInTheDocument();
  });

  test('has proper spacing', () => {
    render(
      <Card>
        <CardHeader data-testid="header">Header</CardHeader>
      </Card>
    );
    const header = screen.getByTestId('header');
    expect(header).toHaveClass('flex', 'flex-col');
  });

  test('applies custom className', () => {
    render(
      <Card>
        <CardHeader className="custom-header" data-testid="header">Header</CardHeader>
      </Card>
    );
    const header = screen.getByTestId('header');
    expect(header).toHaveClass('custom-header');
  });
});

describe('CardTitle Component', () => {
  test('renders card title', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Test Title</CardTitle>
        </CardHeader>
      </Card>
    );
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  test('has proper typography styling', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle data-testid="title">Test Title</CardTitle>
        </CardHeader>
      </Card>
    );
    const title = screen.getByTestId('title');
    expect(title).toHaveClass('text-2xl', 'font-semibold');
  });

  test('applies custom className', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle className="custom-title" data-testid="title">Title</CardTitle>
        </CardHeader>
      </Card>
    );
    const title = screen.getByTestId('title');
    expect(title).toHaveClass('custom-title');
  });
});

describe('CardDescription Component', () => {
  test('renders card description', () => {
    render(
      <Card>
        <CardHeader>
          <CardDescription>Test Description</CardDescription>
        </CardHeader>
      </Card>
    );
    expect(screen.getByText('Test Description')).toBeInTheDocument();
  });

  test('has muted text styling', () => {
    render(
      <Card>
        <CardHeader>
          <CardDescription data-testid="description">Description</CardDescription>
        </CardHeader>
      </Card>
    );
    const description = screen.getByTestId('description');
    expect(description).toHaveClass('text-sm', 'text-gray-400');
  });

  test('applies custom className', () => {
    render(
      <Card>
        <CardHeader>
          <CardDescription className="custom-desc" data-testid="description">Desc</CardDescription>
        </CardHeader>
      </Card>
    );
    const description = screen.getByTestId('description');
    expect(description).toHaveClass('custom-desc');
  });
});

describe('CardContent Component', () => {
  test('renders card content', () => {
    render(
      <Card>
        <CardContent data-testid="content">Content Text</CardContent>
      </Card>
    );
    expect(screen.getByTestId('content')).toBeInTheDocument();
  });

  test('has proper padding', () => {
    render(
      <Card>
        <CardContent data-testid="content">Content</CardContent>
      </Card>
    );
    const content = screen.getByTestId('content');
    expect(content).toHaveClass('p-6');
  });

  test('applies custom className', () => {
    render(
      <Card>
        <CardContent className="custom-content" data-testid="content">Content</CardContent>
      </Card>
    );
    const content = screen.getByTestId('content');
    expect(content).toHaveClass('custom-content');
  });
});

describe('CardFooter Component', () => {
  test('renders card footer', () => {
    render(
      <Card>
        <CardFooter data-testid="footer">Footer Content</CardFooter>
      </Card>
    );
    expect(screen.getByTestId('footer')).toBeInTheDocument();
  });

  test('has flex layout', () => {
    render(
      <Card>
        <CardFooter data-testid="footer">Footer</CardFooter>
      </Card>
    );
    const footer = screen.getByTestId('footer');
    expect(footer).toHaveClass('flex', 'items-center');
  });

  test('applies custom className', () => {
    render(
      <Card>
        <CardFooter className="custom-footer" data-testid="footer">Footer</CardFooter>
      </Card>
    );
    const footer = screen.getByTestId('footer');
    expect(footer).toHaveClass('custom-footer');
  });
});

describe('Card Composition', () => {
  test('renders complete card with all sub-components', () => {
    render(
      <Card data-testid="full-card">
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
          <CardDescription>Card description text</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Main card content goes here</p>
        </CardContent>
        <CardFooter>
          <button>Action Button</button>
        </CardFooter>
      </Card>
    );

    expect(screen.getByTestId('full-card')).toBeInTheDocument();
    expect(screen.getByText('Card Title')).toBeInTheDocument();
    expect(screen.getByText('Card description text')).toBeInTheDocument();
    expect(screen.getByText('Main card content goes here')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /action button/i })).toBeInTheDocument();
  });

  test('renders card with only content', () => {
    render(
      <Card>
        <CardContent>Simple content only</CardContent>
      </Card>
    );

    expect(screen.getByText('Simple content only')).toBeInTheDocument();
  });

  test('renders card with header and content', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Title Only</CardTitle>
        </CardHeader>
        <CardContent>Content here</CardContent>
      </Card>
    );

    expect(screen.getByText('Title Only')).toBeInTheDocument();
    expect(screen.getByText('Content here')).toBeInTheDocument();
  });

  test('supports nested elements', () => {
    render(
      <Card>
        <CardContent>
          <div data-testid="nested-1">
            <span data-testid="nested-2">Deeply nested</span>
          </div>
        </CardContent>
      </Card>
    );

    expect(screen.getByTestId('nested-1')).toBeInTheDocument();
    expect(screen.getByTestId('nested-2')).toBeInTheDocument();
  });

  test('maintains proper semantic structure', () => {
    const { container } = render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
        </CardHeader>
        <CardContent>Content</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>
    );

    const card = container.firstChild;
    expect(card).toBeInTheDocument();
    
    // All sub-components should be children of the card
    expect(screen.getByText('Title').closest('div')).toBeInTheDocument();
    expect(screen.getByText('Content').closest('div')).toBeInTheDocument();
    expect(screen.getByText('Footer').closest('div')).toBeInTheDocument();
  });
});

