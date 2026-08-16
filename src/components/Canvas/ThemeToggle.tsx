'use client';
import React from 'react';
import styled from 'styled-components';
import { useCanvasStore } from '@/lib/store';

const StyledWrapper = styled.div`
  .toggle-switch {
    position: relative;
    width: 56px;
    height: 28px;
    --light: #d8dbe0;
    --dark: #28292c;
    --link: rgb(27, 129, 112);
    --link-hover: rgb(24, 94, 82);
  }

  .switch-label {
    position: absolute;
    width: 100%;
    height: 28px;
    background-color: var(--dark);
    border-radius: 14px;
    cursor: pointer;
    border: 2px solid var(--dark);
  }

  .checkbox {
    position: absolute;
    display: none;
  }

  .slider {
    position: absolute;
    width: 100%;
    height: 100%;
    border-radius: 14px;
    -webkit-transition: 0.3s;
    transition: 0.3s;
  }

  .checkbox:checked ~ .slider {
    background-color: var(--light);
  }

  .slider::before {
    content: "";
    position: absolute;
    top: 4px;
    left: 4px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    -webkit-box-shadow: inset 7px -2px 0px 0px var(--light);
    box-shadow: inset 7px -2px 0px 0px var(--light);
    background-color: var(--dark);
    -webkit-transition: 0.3s;
    transition: 0.3s;
  }

  .checkbox:checked ~ .slider::before {
    -webkit-transform: translateX(28px);
    -ms-transform: translateX(28px);
    transform: translateX(28px);
    background-color: var(--dark);
    -webkit-box-shadow: none;
    box-shadow: none;
  }`;

export function ThemeToggle() {
  const theme = useCanvasStore((s) => s.theme);
  const setTheme = useCanvasStore((s) => s.setTheme);
  const isLight = theme === 'light';
  const label = isLight ? 'Switch to dark theme' : 'Switch to light theme';
  return (
    <StyledWrapper onPointerDown={(e) => e.stopPropagation()}>
      <div className="toggle-switch">
        <label className="switch-label" title={label} aria-label={label}>
          <input
            type="checkbox"
            className="checkbox"
            checked={isLight}
            onChange={(e) => setTheme(e.target.checked ? 'light' : 'dark')}
            aria-label={label}
          />
          <span className="slider" />
        </label>
      </div>
    </StyledWrapper>
  );
}
export default ThemeToggle;
