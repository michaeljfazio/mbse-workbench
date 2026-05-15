import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { ExportMenu } from '@/workspace/ExportMenu';

function noop(): void {}

describe('<ExportMenu />', () => {
  it('renders the trigger title only while disabled', () => {
    const { rerender } = render(
      <ExportMenu
        disabled={true}
        disabledReason="No elements to export"
        onExportPng={noop}
        onExportSvg={noop}
        onExportSysml={noop}
        onExportJson={noop}
      />,
    );
    const trigger = screen.getByTestId('toolbar-export') as HTMLButtonElement;
    expect(trigger.disabled).toBe(true);
    expect(trigger.getAttribute('title')).toBe('No elements to export');

    rerender(
      <ExportMenu
        disabled={false}
        disabledReason="No elements to export"
        onExportPng={noop}
        onExportSvg={noop}
        onExportSysml={noop}
        onExportJson={noop}
      />,
    );
    const enabledTrigger = screen.getByTestId(
      'toolbar-export',
    ) as HTMLButtonElement;
    expect(enabledTrigger.disabled).toBe(false);
    expect(enabledTrigger.getAttribute('title')).toBeNull();
  });

  it('omits the trigger title when disabledReason is not supplied', () => {
    render(
      <ExportMenu
        disabled={true}
        onExportPng={noop}
        onExportSvg={noop}
        onExportSysml={noop}
        onExportJson={noop}
      />,
    );
    const trigger = screen.getByTestId('toolbar-export') as HTMLButtonElement;
    expect(trigger.disabled).toBe(true);
    expect(trigger.getAttribute('title')).toBeNull();
  });

  it('renders the Export SysMLv2 item title only when sysmlDisabled', () => {
    render(
      <ExportMenu
        disabled={false}
        onExportPng={noop}
        onExportSvg={noop}
        onExportSysml={noop}
        onExportJson={noop}
        sysmlDisabled={true}
        sysmlDisabledReason="SysMLv2 export not available"
      />,
    );
    fireEvent.click(screen.getByTestId('toolbar-export'));
    const sysml = screen.getByTestId(
      'toolbar-export-sysml',
    ) as HTMLButtonElement;
    expect(sysml.disabled).toBe(true);
    expect(sysml.getAttribute('title')).toBe('SysMLv2 export not available');
  });

  it('clears the Export SysMLv2 item title when sysmlDisabled flips false', () => {
    render(
      <ExportMenu
        disabled={false}
        onExportPng={noop}
        onExportSvg={noop}
        onExportSysml={noop}
        onExportJson={noop}
        sysmlDisabled={false}
        sysmlDisabledReason="SysMLv2 export not available"
      />,
    );
    fireEvent.click(screen.getByTestId('toolbar-export'));
    const sysml = screen.getByTestId(
      'toolbar-export-sysml',
    ) as HTMLButtonElement;
    expect(sysml.disabled).toBe(false);
    expect(sysml.getAttribute('title')).toBeNull();
  });
});
