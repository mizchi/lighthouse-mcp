# Tool File Structure

## File Naming Convention

All tool files follow a layer-based naming convention:

- **`l0-*.ts`** - Layer 0 (Legacy/Compatibility layer)
- **`l1-*.ts`** - Layer 1 (Data collection layer)
- **`l2-*.ts`** - Layer 2 (Analysis layer)

## Directory Structure

```
src/tools/
├── index.ts              # Main export file
│
├── l0-analyzeUrl.ts      # Legacy: URL analysis wrapper
├── l0-batchAnalyze.ts    # Legacy: Batch analysis wrapper
├── l0-analyzeStored.ts   # Legacy: Stored report analysis wrapper
├── l0-deepAnalysis.ts    # Legacy: Deep analysis wrapper
├── l0-generatePrompt.ts  # Legacy: Prompt generation
│
├── l1-collect.ts         # L1: Data collection tools
│   ├── l1_collect
│   ├── l1_batch_collect
│   ├── l1_list_reports
│   └── l1_get_report
│
└── l2-analyze.ts         # L2: Analysis tools
    ├── l2_performance_analysis
    ├── l2_critical_chain
    ├── l2_unused_code
    ├── l2_deep_analysis
    └── l2_score_analysis
```

## Layer Definitions

### Layer 0 (L0) - Legacy Compatibility
- **Purpose**: Maintain backward compatibility with existing integrations
- **Pattern**: Wrappers around L1/L2 tools
- **Files**: `l0-*.ts`
- **Examples**:
  - `l0-analyzeUrl.ts` - Combines L1 collection + L2 analysis
  - `l0-batchAnalyze.ts` - Uses L1 batch collection
  - `l0-deepAnalysis.ts` - Wraps L2 deep analysis

### Layer 1 (L1) - Data Collection
- **Purpose**: Raw data collection and storage
- **Pattern**: No analysis, just data gathering
- **Files**: `l1-*.ts`
- **Tools**:
  - `l1_collect` - Single URL collection
  - `l1_batch_collect` - Multiple URL collection
  - `l1_list_reports` - List stored reports
  - `l1_get_report` - Retrieve raw report data

### Layer 2 (L2) - Analysis
- **Purpose**: High-level analysis and insights
- **Pattern**: Depends on L1 for data
- **Files**: `l2-*.ts`
- **Tools**:
  - `l2_performance_analysis` - Performance patterns & problems
  - `l2_critical_chain` - Critical request chain analysis
  - `l2_unused_code` - Unused CSS/JS detection
  - `l2_deep_analysis` - Comprehensive analysis
  - `l2_score_analysis` - Score breakdown

## Import Hierarchy

```
External Code
    ↓
index.ts
    ↓
┌─────────────────┐
│  L0 Tools       │ ← Legacy interface
│  (l0-*.ts)      │
└─────────────────┘
    ↓
┌─────────────────┐
│  L2 Tools       │ ← Analysis layer
│  (l2-*.ts)      │
└─────────────────┘
    ↓
┌─────────────────┐
│  L1 Tools       │ ← Collection layer
│  (l1-*.ts)      │
└─────────────────┘
    ↓
Core Modules
```

## Migration Guide

### From Legacy to New Architecture

1. **Direct replacement** (if using basic features):
   ```typescript
   // Old
   import { analyzeUrl } from './tools/analyzeUrl';
   
   // New (same interface, different file)
   import { analyzeUrl } from './tools/l0-analyzeUrl';
   ```

2. **Using new layer-specific tools**:
   ```typescript
   // For data collection only
   import { executeL1Collect } from './tools/l1-collect';
   
   // For analysis of existing data
   import { executeL2PerformanceAnalysis } from './tools/l2-analyze';
   ```

3. **Combining layers manually**:
   ```typescript
   // Collect data
   const { reportId } = await executeL1Collect({ url, device });
   
   // Analyze separately
   const analysis = await executeL2DeepAnalysis({ reportId });
   ```

## Benefits of Layer-Based Structure

1. **Clear separation of concerns**
   - L0: Compatibility
   - L1: Data
   - L2: Intelligence

2. **Easy identification**
   - File prefix immediately shows the layer
   - No ambiguity about tool purpose

3. **Progressive enhancement**
   - Can use L0 for simple cases
   - Drop down to L1/L2 for advanced usage

4. **Better testing**
   - L1 tests focus on data collection
   - L2 tests focus on analysis logic
   - L0 tests ensure compatibility