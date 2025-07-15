import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

interface Language {
  code: string;
  name: string;
}

interface LanguageSelectorProps {
  value: string;
  onChange: (value: string) => void;
  languages: Language[];
  placeholder?: string;
  className?: string;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  value,
  onChange,
  languages,
  placeholder = "Select language",
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const selectedLanguage = languages.find(lang => lang.code === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleSelect = (languageCode: string) => {
    onChange(languageCode);
    setIsOpen(false);
    buttonRef.current?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setIsOpen(!isOpen);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      setIsOpen(true);
    }
  };

  return (
    <div className={`language-selector ${className}`} ref={dropdownRef}>
      <button
        ref={buttonRef}
        type="button"
        className="language-selector-button"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Select language"
      >
        <span className="language-selector-text">
          {selectedLanguage?.name || placeholder}
        </span>
        <ChevronDownIcon 
          className={`language-selector-icon ${isOpen ? 'open' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="language-selector-dropdown">
          <ul role="listbox" className="language-selector-list">
            {languages.map((language) => (
              <li
                key={language.code}
                role="option"
                aria-selected={language.code === value}
                className={`language-selector-option ${
                  language.code === value ? 'selected' : ''
                }`}
                onClick={() => handleSelect(language.code)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSelect(language.code);
                  }
                }}
                tabIndex={0}
              >
                {language.name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;