"use client";
import { useState, useCallback } from 'react';
import { Calculator as CalculatorIcon, X, RotateCcw } from 'lucide-react';

type CalculatorMode = 'Basic' | 'Scientific' | 'Programmer';
type NumberBase = 'DEC' | 'HEX' | 'OCT' | 'BIN';

interface CalculatorProps {
  isOpen: boolean;
  onClose: () => void;
  onResult: (result: string) => void;
}

interface InteractiveBinaryDisplayProps {
  value: number;
  onToggleBit: (bitPosition: number) => void;
}

function InteractiveBinaryDisplay({ value, onToggleBit }: InteractiveBinaryDisplayProps) {
  const binaryString = value.toString(2).padStart(32, '0');
  const groups = [];
  
  // Split into groups of 4 bits
  for (let i = 0; i < 32; i += 4) {
    groups.push(binaryString.slice(i, i + 4));
  }
  
  return (
    <div className="space-y-1">
      {groups.map((group, groupIndex) => {
        const startBit = 31 - (groupIndex * 4);
        const endBit = startBit - 3;
        
        return (
          <div key={groupIndex} className="flex items-center gap-2">
            <div className="flex gap-1">
              {group.split('').map((bit, bitIndex) => {
                const globalBitIndex = groupIndex * 4 + bitIndex;
                const bitPosition = 31 - globalBitIndex; // MSB to LSB
                return (
                  <button
                    key={globalBitIndex}
                    onClick={() => onToggleBit(bitPosition)}
                    className={`w-5 h-5 text-xs font-mono rounded hover:bg-white/20 transition-colors ${
                      bit === '1' 
                        ? 'bg-primary/20 text-primary' 
                        : 'bg-white/10 text-foreground'
                    }`}
                    title={`Bit ${bitPosition}: ${bit}`}
                  >
                    {bit}
                  </button>
                );
              })}
            </div>
            <div className="text-muted-foreground text-xs min-w-[2rem]">
              {startBit}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Calculator({ isOpen, onClose, onResult }: CalculatorProps) {
  const [mode, setMode] = useState<CalculatorMode>('Basic');
  const [display, setDisplay] = useState('0');
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [memory, setMemory] = useState(0);
  
  // Programmer mode specific state
  const [numberBase, setNumberBase] = useState<NumberBase>('DEC');
  const [currentValue, setCurrentValue] = useState<number>(0);
  const [characterMode, setCharacterMode] = useState<'ASCII' | 'Unicode' | 'Hide Binary'>('Hide Binary');
  const [showBinary, setShowBinary] = useState(true);

  // Number base conversion functions
  const convertToBase = useCallback((value: number, base: NumberBase): string => {
    switch (base) {
      case 'HEX': return value.toString(16).toUpperCase();
      case 'OCT': return value.toString(8);
      case 'BIN': return value.toString(2);
      case 'DEC': 
      default: return value.toString();
    }
  }, []);

  const convertFromBase = useCallback((value: string, base: NumberBase): number => {
    switch (base) {
      case 'HEX': return parseInt(value, 16);
      case 'OCT': return parseInt(value, 8);
      case 'BIN': return parseInt(value, 2);
      case 'DEC':
      default: return parseInt(value, 10);
    }
  }, []);

  const inputNumber = useCallback((num: string) => {
    if (mode === 'Programmer') {
      // Handle programmer mode number input
      if (waitingForOperand) {
        setCurrentValue(parseInt(num, getBaseMultiplier(numberBase)));
        setDisplay(num);
        setWaitingForOperand(false);
      } else {
        const currentNum = convertFromBase(display, numberBase);
        const newValue = currentNum * getBaseMultiplier(numberBase) + parseInt(num, getBaseMultiplier(numberBase));
        setCurrentValue(newValue);
        setDisplay(convertToBase(newValue, numberBase));
      }
    } else {
      // Handle basic/scientific mode
      if (waitingForOperand) {
        setDisplay(num);
        setWaitingForOperand(false);
      } else {
        setDisplay(display === '0' ? num : display + num);
      }
    }
  }, [display, waitingForOperand, mode, numberBase, convertToBase, convertFromBase]);

  const getBaseMultiplier = (base: NumberBase): number => {
    switch (base) {
      case 'HEX': return 16;
      case 'OCT': return 8;
      case 'BIN': return 2;
      case 'DEC':
      default: return 10;
    }
  };

  const inputDecimal = useCallback(() => {
    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
    } else if (display.indexOf('.') === -1) {
      setDisplay(display + '.');
    }
  }, [display, waitingForOperand]);

  const clear = useCallback(() => {
    setDisplay('0');
    setCurrentValue(0);
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(false);
  }, []);

  const performOperation = useCallback((nextOperation: string) => {
    const inputValue = parseFloat(display);

    if (previousValue === null) {
      setPreviousValue(inputValue);
    } else if (operation) {
      const currentValue = previousValue || 0;
      const newValue = calculate(currentValue, inputValue, operation);

      setDisplay(String(newValue));
      setPreviousValue(newValue);
    }

    setWaitingForOperand(true);
    setOperation(nextOperation);
  }, [display, previousValue, operation]);

  const calculate = (firstValue: number, secondValue: number, operation: string): number => {
    switch (operation) {
      case '+': return firstValue + secondValue;
      case '-': return firstValue - secondValue;
      case '×': return firstValue * secondValue;
      case '÷': return secondValue !== 0 ? firstValue / secondValue : 0;
      case '^': return Math.pow(firstValue, secondValue);
      case '√': return Math.sqrt(secondValue);
      case 'sin': return Math.sin(secondValue * Math.PI / 180);
      case 'cos': return Math.cos(secondValue * Math.PI / 180);
      case 'tan': return Math.tan(secondValue * Math.PI / 180);
      case 'log': return Math.log10(secondValue);
      case 'ln': return Math.log(secondValue);
      case 'π': return Math.PI;
      case 'e': return Math.E;
      default: return secondValue;
    }
  };

  const handleEquals = useCallback(() => {
    const inputValue = parseFloat(display);

    if (previousValue !== null && operation) {
      const newValue = calculate(previousValue, inputValue, operation);
      setDisplay(String(newValue));
      setPreviousValue(null);
      setOperation(null);
      setWaitingForOperand(true);
    }
  }, [display, previousValue, operation]);

  const handleMemoryOperation = useCallback((op: string) => {
    const currentValue = parseFloat(display);
    switch (op) {
      case 'MC': setMemory(0); break;
      case 'MR': setDisplay(String(memory)); break;
      case 'M+': setMemory(memory + currentValue); break;
      case 'M-': setMemory(memory - currentValue); break;
    }
  }, [display, memory]);

  const handleScientificFunction = useCallback((func: string) => {
    const currentValue = parseFloat(display);
    let result: number;

    switch (func) {
      case 'sin': result = Math.sin(currentValue * Math.PI / 180); break;
      case 'cos': result = Math.cos(currentValue * Math.PI / 180); break;
      case 'tan': result = Math.tan(currentValue * Math.PI / 180); break;
      case 'log': result = Math.log10(currentValue); break;
      case 'ln': result = Math.log(currentValue); break;
      case '√': result = Math.sqrt(currentValue); break;
      case 'x²': result = currentValue * currentValue; break;
      case 'x³': result = currentValue * currentValue * currentValue; break;
      case '1/x': result = 1 / currentValue; break;
      case 'x!': result = factorial(currentValue); break;
      case 'π': result = Math.PI; break;
      case 'e': result = Math.E; break;
      default: result = currentValue;
    }

    setDisplay(String(result));
    setWaitingForOperand(true);
  }, [display]);

  const factorial = (n: number): number => {
    if (n < 0) return NaN;
    if (n === 0 || n === 1) return 1;
    return n * factorial(n - 1);
  };

  const handleBaseChange = useCallback((newBase: NumberBase) => {
    setNumberBase(newBase);
    setDisplay(convertToBase(currentValue, newBase));
  }, [currentValue, convertToBase]);

  const handleCharacterModeChange = useCallback((mode: 'ASCII' | 'Unicode' | 'Hide Binary') => {
    setCharacterMode(mode);
  }, []);

  const toggleBinaryDisplay = useCallback(() => {
    setShowBinary(prev => !prev);
  }, []);

  const toggleBinaryDigit = useCallback((bitPosition: number) => {
    const mask = 1 << bitPosition;
    const newValue = currentValue ^ mask;
    setCurrentValue(newValue);
    setDisplay(convertToBase(newValue, numberBase));
    setWaitingForOperand(true);
  }, [currentValue, numberBase, convertToBase]);

  const getCharacterRepresentation = useCallback((value: number, mode: 'ASCII' | 'Unicode' | 'Hide Binary'): string => {
    switch (mode) {
      case 'ASCII':
        if (value >= 0 && value <= 127) {
          return String.fromCharCode(value);
        }
        return '?';
      case 'Unicode':
        if (value >= 0 && value <= 1114111) { // Valid Unicode range
          try {
            return String.fromCharCode(value);
          } catch {
            return '?';
          }
        }
        return '?';
      case 'Hide Binary':
      default:
        return '';
    }
  }, []);

  const handleProgrammerOperation = useCallback((op: string) => {
    const currentNum = convertFromBase(display, numberBase);
    let result: number;

    switch (op) {
      case 'AND': 
        if (previousValue !== null) {
          result = previousValue & currentNum;
        } else {
          result = currentNum;
          setPreviousValue(currentNum);
        }
        break;
      case 'OR': 
        if (previousValue !== null) {
          result = previousValue | currentNum;
        } else {
          result = currentNum;
          setPreviousValue(currentNum);
        }
        break;
      case 'XOR': 
        if (previousValue !== null) {
          result = previousValue ^ currentNum;
        } else {
          result = currentNum;
          setPreviousValue(currentNum);
        }
        break;
      case 'NOR': 
        if (previousValue !== null) {
          result = ~(previousValue | currentNum);
        } else {
          result = ~currentNum;
        }
        break;
      case 'NOT': result = ~currentNum; break;
      case '<<': result = currentNum << 1; break;
      case '>>': result = currentNum >> 1; break;
      case 'X<<Y': 
        if (previousValue !== null) {
          result = previousValue << currentNum;
        } else {
          result = currentNum;
        }
        break;
      case 'X>>Y': 
        if (previousValue !== null) {
          result = previousValue >> currentNum;
        } else {
          result = currentNum;
        }
        break;
      case 'RoL': result = (currentNum << 1) | (currentNum >>> 31); break;
      case 'RoR': result = (currentNum >>> 1) | (currentNum << 31); break;
      case 'NEG': result = -currentNum; break;
      case 'mod': 
        if (previousValue !== null) {
          result = previousValue % currentNum;
        } else {
          result = currentNum;
        }
        break;
      case 'flip₈': result = ~currentNum & 0xFF; break;
      case 'flip₁₆': result = ~currentNum & 0xFFFF; break;
      default: result = currentNum;
    }

    setCurrentValue(result);
    setDisplay(convertToBase(result, numberBase));
    setWaitingForOperand(true);
  }, [display, numberBase, currentValue, previousValue, convertFromBase, convertToBase]);

  const insertResult = useCallback(() => {
    onResult(display);
    onClose();
  }, [display, onResult, onClose]);

  if (!isOpen) return null;

  const basicButtons = [
    ['C', '±', '%', '÷'],
    ['7', '8', '9', '×'],
    ['4', '5', '6', '-'],
    ['1', '2', '3', '+'],
    ['0', '.', '=', '=']
  ];

  const scientificButtons = [
    ['sin', 'cos', 'tan', 'log'],
    ['ln', '√', 'x²', 'x³'],
    ['1/x', 'x!', 'π', 'e'],
    ['(', ')', '^', '÷'],
    ['7', '8', '9', '×'],
    ['4', '5', '6', '-'],
    ['1', '2', '3', '+'],
    ['0', '.', '=', '=']
  ];

  const programmerButtons = [
    ['(', ')', 'XOR', 'D', 'E', 'F', 'AC'],
    ['AND', 'OR', 'NOR', 'A', 'B', 'C', '÷'],
    ['NOT', '<<', '>>', '7', '8', '9', '×'],
    ['NEG', 'X<<Y', 'X>>Y', '4', '5', '6', '-'],
    ['mod', 'RoL', 'RoR', '1', '2', '3', '+'],
    ['calc', 'flip₈', 'flip₁₆', 'FF', '0', '00', '=']
  ];

  const getButtons = () => {
    switch (mode) {
      case 'Scientific': return scientificButtons;
      case 'Programmer': return programmerButtons;
      default: return basicButtons;
    }
  };

  const handleButtonClick = (button: string) => {
    if (button >= '0' && button <= '9') {
      inputNumber(button);
    } else if (button === '.') {
      inputDecimal();
    } else if (button === 'C' || button === 'AC') {
      clear();
    } else if (button === '=') {
      handleEquals();
    } else if (['+', '-', '×', '÷', '^'].includes(button)) {
      performOperation(button);
    } else if (['sin', 'cos', 'tan', 'log', 'ln', '√', 'x²', 'x³', '1/x', 'x!', 'π', 'e'].includes(button)) {
      handleScientificFunction(button);
    } else if (['AND', 'OR', 'XOR', 'NOT', '<<', '>>', 'X<<Y', 'X>>Y', 'RoL', 'RoR', 'NEG', 'mod', 'flip₈', 'flip₁₆', 'NOR'].includes(button)) {
      handleProgrammerOperation(button);
    } else if (['A', 'B', 'C', 'D', 'E', 'F'].includes(button)) {
      if (mode === 'Programmer' && numberBase === 'HEX') {
        inputNumber(button);
      }
    } else if (button === 'FF') {
      if (mode === 'Programmer') {
        setCurrentValue(255);
        setDisplay(convertToBase(255, numberBase));
        setWaitingForOperand(true);
      }
    } else if (button === '00') {
      if (mode === 'Programmer') {
        const currentNum = convertFromBase(display, numberBase);
        const newValue = currentNum * getBaseMultiplier(numberBase);
        setCurrentValue(newValue);
        setDisplay(convertToBase(newValue, numberBase));
      }
    } else if (button === 'calc') {
      // Switch to basic mode
      setMode('Basic');
    } else if (button === '(' || button === ')') {
      // Handle parentheses - for now just ignore or could implement expression parsing
      // Parentheses functionality can be added in future updates
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card/95 backdrop-blur-xl border border-border/20 rounded-2xl w-[28rem] max-w-[95vw] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/20">
          <div className="flex items-center gap-2">
            <CalculatorIcon className="w-5 h-5 text-primary" />
            <span className="font-semibold text-foreground">Calculator</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Main Display */}
        <div className="p-6">
          <div className="text-right text-5xl font-light text-foreground mb-6 font-mono break-all">
            {display}
          </div>

          {/* Programmer Mode Specific UI */}
          {mode === 'Programmer' && (
            <div className="mb-4">
              {/* Mode Tabs */}
              <div className="flex gap-1 mb-3">
                <button 
                  onClick={() => handleCharacterModeChange('ASCII')}
                  className={`px-3 py-1 text-sm rounded transition-colors ${
                    characterMode === 'ASCII' 
                      ? 'bg-white/10 text-foreground' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                  }`}
                >
                  ASCII
                </button>
                <button 
                  onClick={() => handleCharacterModeChange('Unicode')}
                  className={`px-3 py-1 text-sm rounded transition-colors ${
                    characterMode === 'Unicode' 
                      ? 'bg-white/10 text-foreground' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                  }`}
                >
                  Unicode
                </button>
                <button 
                  onClick={toggleBinaryDisplay}
                  className={`px-3 py-1 text-sm rounded transition-colors ${
                    showBinary 
                      ? 'text-muted-foreground hover:text-foreground hover:bg-white/5' 
                      : 'bg-white/10 text-foreground'
                  }`}
                  title={showBinary ? 'Hide binary display' : 'Show binary display'}
                >
                  {showBinary ? 'Hide Binary' : 'Show Binary'}
                </button>
              </div>

              {/* Number Base Selector */}
              <div className="flex gap-1 mb-3">
                <button
                  onClick={() => handleBaseChange('OCT')}
                  className={`px-3 py-1 text-sm rounded ${
                    numberBase === 'OCT' ? 'bg-primary text-primary-foreground' : 'bg-white/10 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  8
                </button>
                <button
                  onClick={() => handleBaseChange('DEC')}
                  className={`px-3 py-1 text-sm rounded ${
                    numberBase === 'DEC' ? 'bg-primary text-primary-foreground' : 'bg-white/10 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  10
                </button>
                <button
                  onClick={() => handleBaseChange('HEX')}
                  className={`px-3 py-1 text-sm rounded ${
                    numberBase === 'HEX' ? 'bg-primary text-primary-foreground' : 'bg-white/10 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  16
                </button>
              </div>

              {/* Multi-base Display */}
              <div className="space-y-3 text-sm font-mono">
                <div className="flex justify-between text-muted-foreground text-xs">
                  <span>63</span>
                  <span>32</span>
                </div>
                <div className="text-foreground text-base">
                  {convertToBase(currentValue, 'HEX').padStart(8, '0').toUpperCase()}
                </div>
                <div className="flex justify-between text-muted-foreground text-xs">
                  <span>47</span>
                  <span>0</span>
                </div>
                <div className="text-foreground text-base">
                  {convertToBase(currentValue, 'DEC')}
                </div>
                <div className="flex justify-between text-muted-foreground text-xs">
                  <span>31</span>
                  <span>0</span>
                </div>
                {showBinary ? (
                  <InteractiveBinaryDisplay 
                    value={currentValue} 
                    onToggleBit={toggleBinaryDigit}
                  />
                ) : (
                  <div className="text-foreground text-xs break-all">
                    {convertToBase(currentValue, 'BIN').padStart(32, '0')}
                  </div>
                )}
                
                {/* Character Representation */}
                {characterMode !== 'Hide Binary' && (
                  <div className="mt-4 pt-3 border-t border-border/20">
                    <div className="flex justify-between text-muted-foreground text-xs mb-1">
                      <span>{characterMode}</span>
                      <span>Character</span>
                    </div>
                    <div className="text-foreground text-lg font-sans">
                      {getCharacterRepresentation(currentValue, characterMode)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mode Selector - Always Visible */}
          <div className="flex gap-1 mb-4 p-1 bg-white/5 rounded-lg">
            {(['Basic', 'Scientific', 'Programmer'] as CalculatorMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-colors ${
                  mode === m
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/10'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Buttons Grid */}
          <div className={`grid gap-2 ${mode === 'Programmer' ? 'grid-cols-7' : 'grid-cols-4'}`}>
            {getButtons().flat().map((button, index) => {
              const isOperator = ['+', '-', '×', '÷', '=', 'AC'].includes(button);
              const isHexDigit = ['A', 'B', 'C', 'D', 'E', 'F'].includes(button);
              const isDisabled = mode === 'Programmer' && isHexDigit && numberBase !== 'HEX';
              const isSmallButton = ['X<<Y', 'X>>Y', 'flip₈', 'flip₁₆'].includes(button);
              
              return (
                <button
                  key={index}
                  onClick={() => handleButtonClick(button)}
                  disabled={isDisabled}
                  className={`p-3 rounded-lg font-medium transition-colors text-sm ${
                    isOperator
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : isDisabled
                      ? 'bg-white/5 text-muted-foreground cursor-not-allowed'
                      : 'bg-white/10 text-foreground hover:bg-white/20'
                  } ${button === '0' && mode !== 'Programmer' ? 'col-span-2' : ''} ${
                    isSmallButton ? 'text-xs' : ''
                  }`}
                >
                  {button}
                </button>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={insertResult}
              className="flex-1 py-2 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              Insert Result
            </button>
            <button
              onClick={clear}
              className="p-2 rounded-lg bg-white/10 text-foreground hover:bg-white/20 transition-colors"
              title="Clear"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
