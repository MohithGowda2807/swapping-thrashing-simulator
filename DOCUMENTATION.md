# Thrashing & Swapping 3D Visualizer
## Complete Technical Documentation for Operating Systems Lab

**Course**: Operating Systems Laboratory  
**Project**: Memory Management Visualization - Paging, Swapping, and Thrashing  
**Technology Stack**: HTML5, CSS3, JavaScript, Three.js (WebGL)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Core Operating System Concepts](#2-core-operating-system-concepts)
   - 2.1 [Virtual Memory](#21-virtual-memory)
   - 2.2 [Paging](#22-paging)
   - 2.3 [Page Faults](#23-page-faults)
   - 2.4 [Swapping](#24-swapping)
   - 2.5 [Thrashing](#25-thrashing)
   - 2.6 [Page Replacement Algorithms](#26-page-replacement-algorithms)
   - 2.7 [Locality of Reference](#27-locality-of-reference)
   - 2.8 [Working Set Model](#28-working-set-model)
3. [System Architecture](#3-system-architecture)
4. [Data Structures Implementation](#4-data-structures-implementation)
5. [Algorithm Implementations](#5-algorithm-implementations)
6. [Simulation Engine](#6-simulation-engine)
7. [Visualization Pipeline](#7-visualization-pipeline)
8. [API Reference](#8-api-reference)
9. [Performance Analysis](#9-performance-analysis)
10. [Educational Scenarios](#10-educational-scenarios)
11. [How Concepts Map to Real OS Kernels](#11-how-concepts-map-to-real-os-kernels)

---

## 1. Executive Summary

This project implements a **real-time, interactive 3D visualization** of memory management concepts that are fundamental to operating systems. The visualizer demonstrates how operating systems handle:

- **Physical memory (RAM)** management through frames
- **Virtual memory** through paging
- **Disk-based swap space** for memory extension
- **Page replacement** when RAM is full
- **Thrashing detection** when swapping becomes excessive

The project is built entirely in JavaScript using Three.js for WebGL-based 3D rendering, requiring no backend or operating system dependencies. It simulates the kernel-level memory management behavior in a browser environment.

---

## 2. Core Operating System Concepts

### 2.1 Virtual Memory

**Definition**: Virtual memory is a memory management technique that provides an abstraction of the storage resources available to a process, allowing programs to use more memory than physically available.

**How It Works**:
1. Each process has its own **virtual address space**
2. Virtual addresses are translated to **physical addresses** at runtime
3. Not all virtual memory needs to be in physical RAM at once
4. Pages not currently in RAM can reside on disk (swap space)

**Implementation in This Project**:
```javascript
// In Page.js - Each page has a virtual address
class Page {
    constructor(id, processId, processName) {
        this.virtualAddress = id * 4096;  // Virtual address (symbolic, 4KB pages)
        this.frameId = null;              // Physical location in RAM (if present)
        this.diskBlockId = null;          // Location in swap (if swapped out)
        this.location = 'none';           // 'ram' | 'disk' | 'none'
    }
}
```

**Real OS Kernel Equivalent**:
- Linux: `struct page` in `include/linux/mm_types.h`
- Windows: `MMPTE` (Memory Management Page Table Entry)

### 2.2 Paging

**Definition**: Paging is a memory management scheme that eliminates the need for contiguous allocation of physical memory, thus eliminating external fragmentation.

**Key Components**:
1. **Page**: A fixed-size block of virtual memory (typically 4KB)
2. **Frame**: A fixed-size block of physical memory (same size as page)
3. **Page Table**: Maps virtual pages to physical frames

**Implementation**:
```javascript
// Page.js - Represents a memory page
class Page {
    constructor(id, processId, processName) {
        this.id = id;                    // Unique page number
        this.processId = processId;      // Owner process
        this.virtualAddress = id * 4096; // Virtual address (4KB page size)
        this.frameId = null;             // Physical frame number (if in RAM)
        this.location = 'none';          // Current location
    }
}

// Frame.js - Represents a physical RAM frame
class Frame {
    constructor(id) {
        this.id = id;           // Frame number
        this.page = null;       // Currently held page
        this.isFree = true;     // Allocation status
    }

    allocate(page) {
        this.page = page;
        this.isFree = false;
    }

    free() {
        this.page = null;
        this.isFree = true;
    }
}
```

**Page Table Structure (Simulated)**:
| Virtual Page | Physical Frame | Present Bit | Location |
|--------------|----------------|-------------|----------|
| 0            | 5              | 1           | RAM      |
| 1            | null           | 0           | Disk     |
| 2            | 12             | 1           | RAM      |

### 2.3 Page Faults

**Definition**: A page fault occurs when a process accesses a page that is not currently in physical memory (RAM).

**Page Fault Handling Steps**:
1. Process attempts to access a virtual address
2. MMU (Memory Management Unit) checks page table
3. If page is not in RAM (present bit = 0), **page fault** occurs
4. OS kernel handles the fault:
   - Find the page on disk (swap space)
   - Find a free frame in RAM
   - If no free frame, evict a victim page
   - Load the requested page into the free frame
   - Update page table
   - Resume the process

**Implementation**:
```javascript
// SimulationEngine.js - Page fault handling
handlePageFault(page) {
    // 1. Record statistics
    this.stats.totalPageFaults++;
    this.stats.pageFaultTimes.push(Date.now());
    
    // 2. Find free frame or evict
    if (this.freeFrames.length === 0) {
        // RAM full - must evict a page
        this.evictPage();
    }
    
    // 3. Swap in from disk if page was there
    if (page.location === 'disk' && page.diskBlockId !== null) {
        this.swapSystem.freeBlock(page.diskBlockId);  // Free disk block
        this.stats.swapInCount++;
        // Trigger callbacks for visualization
        if (this.callbacks.onPageSwappedIn) {
            this.callbacks.onPageSwappedIn(page);
        }
    }
    
    // 4. Allocate page to RAM
    this.allocatePageToFrame(page);
    
    // 5. Check if thrashing has started
    this.checkThrashing();
}
```

**Real OS Kernel - Page Fault Handler**:
- Linux: `do_page_fault()` in `arch/x86/mm/fault.c`
- The hardware raises an exception (interrupt 14 on x86)
- Control transfers to kernel's page fault handler

### 2.4 Swapping

**Definition**: Swapping is the process of moving pages between RAM and secondary storage (disk) to manage limited physical memory.

**Types of Swap Operations**:
1. **Swap Out**: Moving a page from RAM to disk to free a frame
2. **Swap In**: Moving a page from disk to RAM when needed

**Implementation**:
```javascript
// SwapSystem.js - Manages swap space on disk
class SwapSystem {
    constructor(blockCount) {
        this.blockCount = blockCount;    // Total swap blocks
        this.blocks = [];                 // Array of DiskBlock objects
        this.freeBlocks = [];             // List of free blocks
        this.swapInCount = 0;             // I/O statistics
        this.swapOutCount = 0;
    }

    // Allocate a block for page being swapped out
    allocateBlock(page) {
        if (this.freeBlocks.length === 0) {
            console.error('Swap space full!');
            return null;
        }
        
        const block = this.freeBlocks.shift();  // Get first free block
        block.allocate(page);
        page.moveToDisk(block.id);
        
        this.swapOutCount++;
        this.recordIO('out');
        
        return block;
    }

    // Free a block when page is swapped back in
    freeBlock(blockId) {
        const block = this.blocks[blockId];
        block.free();
        this.freeBlocks.push(block);
        
        this.swapInCount++;
        this.recordIO('in');
    }

    // Calculate I/O rate (operations per second)
    getIORate() {
        const now = Date.now();
        const recentOps = this.ioOperations.filter(
            op => now - op.time < this.ioWindow  // 1 second window
        );
        return (recentOps.length / this.ioWindow) * 1000;
    }
}
```

**Swap Space Layout (Disk Visualization)**:
```
         ┌─────────────────────────────────────┐
         │           DISK PLATTER              │
         │    ┌───┐     ┌───┐     ┌───┐       │
         │   │ P2 │    │ P5 │    │ P8 │  Ring 1│
         │    └───┘     └───┘     └───┘       │
         │  ┌───┐  ┌───┐  ┌───┐  ┌───┐ Ring 2 │
         │ │ P1 │ │   │ │P12│ │   │          │
         │  └───┘  └───┘  └───┘  └───┘        │
         │         ┌─────────┐                │
         │         │  HUB    │   Ring 3       │
         │         └─────────┘                │
         └─────────────────────────────────────┘
```

### 2.5 Thrashing

**Definition**: Thrashing occurs when a system spends more time swapping pages in and out of memory than executing actual processes.

**Causes**:
1. Working sets of all active processes exceed available RAM
2. Too many processes competing for limited memory
3. Poor locality of reference in applications

**Detection Formula**:
```
Thrashing Level = (Swap I/O Rate / Threshold) × 100%

If Thrashing Level > 100%, system is thrashing
```

**Implementation**:
```javascript
// SimulationEngine.js - Thrashing detection
checkThrashing() {
    const ioRate = this.swapSystem.getIORate();  // Swap ops per second
    const wasThrashing = this.isThrashing;
    
    // Threshold: 5 swap operations per second
    this.isThrashing = ioRate >= this.thrashingThreshold;
    
    // Notify if state changed
    if (wasThrashing !== this.isThrashing) {
        if (this.callbacks.onThrashingChange) {
            this.callbacks.onThrashingChange(this.isThrashing);
        }
    }
}

// Calculate thrashing level for KPI display
getThrashingLevel() {
    const ioRate = this.swapSystem.getIORate();
    return Math.min(100, (ioRate / this.thrashingThreshold) * 100);
}
```

**Visual Effects During Thrashing**:
```javascript
// EffectsManager.js - Thrashing effects
activateThrashing() {
    this.isThrashing = true;
    this.particles.visible = true;    // Red/orange particle swirl
    this.shakeIntensity = 0.3;        // Camera shake
}
```

**Solutions to Thrashing (in Real Systems)**:
1. **Reduce degree of multiprogramming** - suspend some processes
2. **Local page replacement** - each process replaces only its own pages
3. **Working set model** - allocate frames based on working set size
4. **Page fault frequency (PFF)** - adjust allocation based on fault rate

### 2.6 Page Replacement Algorithms

When RAM is full and a new page must be loaded, the OS must choose a **victim page** to evict. The choice significantly impacts performance.

#### 2.6.1 FIFO (First-In-First-Out)

**Concept**: Evict the page that has been in RAM the longest.

**Data Structure**: Queue

**Time Complexity**: O(n) to find oldest page, O(1) if queue is maintained

**Implementation**:
```javascript
// FIFO.js - First In First Out replacement
class FIFO extends PolicyInterface {
    constructor() {
        super('FIFO');
        this.queue = [];  // Queue of page IDs in order of arrival
    }

    // Select the oldest page (first in queue)
    selectVictim(ramPages) {
        if (ramPages.length === 0) return null;
        
        // Find the page with earliest load time
        let oldestPage = ramPages[0];
        for (const page of ramPages) {
            if (page.loadTime < oldestPage.loadTime) {
                oldestPage = page;
            }
        }
        return oldestPage;
    }

    // Track page load order
    onPageLoad(page, timestamp) {
        page.loadTime = timestamp;
        if (this.queue.indexOf(page.id) === -1) {
            this.queue.push(page.id);
        }
    }
}
```

**Belady's Anomaly**: FIFO is the only algorithm that can exhibit this anomaly where **more frames cause more page faults**.

**Example Showing Anomaly**:
| Reference | 3 Frames | 4 Frames |
|-----------|----------|----------|
| 1,2,3,4,1,2,5,1,2,3,4,5 | 9 faults | 10 faults |

#### 2.6.2 LRU (Least Recently Used)

**Concept**: Evict the page that hasn't been accessed for the longest time.

**Rationale**: Based on temporal locality - pages used recently are likely to be used again soon.

**Data Structures**: 
- **Doubly Linked List**: For O(1) move to front
- **HashMap**: For O(1) node lookup

**Time Complexity**: O(1) for both access and eviction

**Implementation**:
```javascript
// LRU.js - O(1) implementation using doubly-linked list + HashMap

// Doubly Linked List Node
class LRUNode {
    constructor(page) {
        this.page = page;
        this.prev = null;
        this.next = null;
    }
}

class LRU extends PolicyInterface {
    constructor() {
        super('LRU');
        
        // Doubly linked list: head = most recent, tail = least recent
        this.head = null;  // Most recently used
        this.tail = null;  // Least recently used (victim candidate)
        
        // HashMap for O(1) node lookup: pageId -> LRUNode
        this.nodeMap = new Map();
    }

    // Select victim: O(1) - just return tail
    selectVictim(ramPages) {
        if (this.tail) {
            return this.tail.page;
        }
        // Fallback to linear search if list not maintained
        return ramPages.reduce((lru, page) => 
            page.lastAccessTime < lru.lastAccessTime ? page : lru
        );
    }

    // On page access: move to front - O(1)
    onPageAccess(page, timestamp) {
        super.onPageAccess(page, timestamp);
        this.moveToFront(page);
    }

    // Add new page to front of list - O(1)
    addToFront(page) {
        if (this.nodeMap.has(page.id)) {
            this.moveToFront(page);
            return;
        }
        
        const node = new LRUNode(page);
        this.nodeMap.set(page.id, node);
        
        if (!this.head) {
            // Empty list
            this.head = node;
            this.tail = node;
        } else {
            // Add to front
            node.next = this.head;
            this.head.prev = node;
            this.head = node;
        }
    }

    // Move existing node to front - O(1)
    moveToFront(page) {
        const node = this.nodeMap.get(page.id);
        if (!node) {
            this.addToFront(page);
            return;
        }
        
        // Already at front
        if (node === this.head) return;
        
        // Remove from current position
        if (node.prev) node.prev.next = node.next;
        if (node.next) node.next.prev = node.prev;
        
        // Update tail if needed
        if (node === this.tail) {
            this.tail = node.prev;
        }
        
        // Move to front
        node.prev = null;
        node.next = this.head;
        if (this.head) this.head.prev = node;
        this.head = node;
    }

    // Remove page from list when evicted - O(1)
    onEvict(page) {
        const node = this.nodeMap.get(page.id);
        if (!node) return;
        
        if (node.prev) node.prev.next = node.next;
        if (node.next) node.next.prev = node.prev;
        
        if (node === this.head) this.head = node.next;
        if (node === this.tail) this.tail = node.prev;
        
        this.nodeMap.delete(page.id);
    }
}
```

**LRU List Visualization**:
```
Most Recent                          Least Recent (Victim)
    ↓                                        ↓
┌─────┐ ←→ ┌─────┐ ←→ ┌─────┐ ←→ ┌─────┐ ←→ ┌─────┐
│ P7  │    │ P3  │    │ P1  │    │ P9  │    │ P4  │
└─────┘    └─────┘    └─────┘    └─────┘    └─────┘
  HEAD                                         TAIL
   ↑
On access, P7 moved here
```

**Comparison Table**:
| Algorithm | Time: Select | Time: Access | Space | Anomaly Free |
|-----------|-------------|--------------|-------|--------------|
| FIFO      | O(n)        | O(1)         | O(n)  | ❌ No        |
| LRU       | O(1)        | O(1)         | O(n)  | ✅ Yes       |
| Optimal   | O(n)        | O(1)         | O(n)  | ✅ Yes       |

### 2.7 Locality of Reference

**Definition**: The tendency of programs to access the same set of memory locations repeatedly over a short period of time.

**Types**:
1. **Temporal Locality**: Recently accessed pages will be accessed again soon
2. **Spatial Locality**: Pages near recently accessed pages will be accessed soon

**Implementation (Workload Generation)**:
```javascript
// Process.js - Locality-based page access
class Process {
    constructor(id, name, pageCount, options = {}) {
        this.locality = options.locality || 0.7;  // 0-1, higher = better locality
        this.workingSetSize = Math.ceil(pageCount * 0.4);  // Active pages
    }

    // Get random page based on locality
    getRandomPageToAccess() {
        if (Math.random() < this.locality) {
            // High locality: access from working set (recently used pages)
            const recentPages = [...this.pages]
                .sort((a, b) => b.lastAccessTime - a.lastAccessTime)
                .slice(0, this.workingSetSize);
            return recentPages[Math.floor(Math.random() * recentPages.length)];
        } else {
            // Low locality: random access across all pages
            return this.pages[Math.floor(Math.random() * this.pages.length)];
        }
    }
}
```

**Impact on Page Faults**:
| Locality Factor | Expected Page Faults | System Behavior |
|-----------------|---------------------|-----------------|
| 0.9 - 1.0       | Very Low            | Stable, efficient |
| 0.6 - 0.8       | Moderate            | Occasional swapping |
| 0.3 - 0.5       | High                | Frequent swapping |
| 0.0 - 0.2       | Very High           | Thrashing likely |

### 2.8 Working Set Model

**Definition**: The set of pages that a process is currently using (has referenced in the recent past).

**Working Set Window**: A time interval (Δ) defining "recent"

**Formula**:
```
Working Set (t, Δ) = { pages referenced in time interval [t-Δ, t] }
```

**Implementation**:
```javascript
// Process.js
class Process {
    constructor(id, name, pageCount, options = {}) {
        this.workingSetSize = options.workingSetSize || 
                              Math.ceil(pageCount * 0.4);
    }

    // Get current working set (recently accessed pages)
    getWorkingSet() {
        return [...this.pages]
            .sort((a, b) => b.lastAccessTime - a.lastAccessTime)
            .slice(0, this.workingSetSize);
    }
}
```

**Working Set Principle**: If the sum of all processes' working sets exceeds available RAM, thrashing is inevitable.

---

## 3. System Architecture

### 3.1 Module Dependency Graph

```
┌─────────────────────────────────────────────────────────────────────┐
│                          main.js                                     │
│                   ThrashingVisualizer (Main Controller)              │
└───────────┬───────────────────┬────────────────────┬────────────────┘
            │                   │                    │
            ▼                   ▼                    ▼
┌───────────────────┐ ┌─────────────────┐ ┌─────────────────────────┐
│  SimulationEngine │ │  SceneManager   │ │   UI Components         │
│  (Core Logic)     │ │  (3D Rendering) │ │   KPIDashboard          │
└────────┬──────────┘ └────────┬────────┘ │   Controls              │
         │                     │          │   EventLog              │
         ▼                     ▼          │   ScenarioSelector      │
┌─────────────────────────────────────┐   └─────────────────────────┘
│         Core Classes                │
│  ┌─────┐ ┌───────┐ ┌──────────────┐│
│  │Page │ │Frame  │ │DiskBlock     ││
│  └─────┘ └───────┘ └──────────────┘│
│  ┌─────────┐ ┌──────────────────┐  │
│  │Process  │ │SwapSystem        │  │
│  └─────────┘ └──────────────────┘  │
└─────────────────────────────────────┘
         │                     │
         ▼                     ▼
┌─────────────────┐   ┌───────────────────────────────────────┐
│    Policies     │   │          Rendering                    │
│  ┌───────────┐  │   │  ┌─────────────┐ ┌─────────────────┐  │
│  │PolicyBase │  │   │  │RAMVisualizer│ │DiskVisualizer   │  │
│  └─────┬─────┘  │   │  └─────────────┘ └─────────────────┘  │
│    ┌───┴───┐    │   │  ┌─────────────┐ ┌─────────────────┐  │
│  ┌─┴──┐ ┌──┴─┐  │   │  │PageRenderer │ │EffectsManager   │  │
│  │FIFO│ │LRU │  │   │  └─────────────┘ └─────────────────┘  │
│  └────┘ └────┘  │   └───────────────────────────────────────┘
└─────────────────┘
```

### 3.2 File Structure

```
thrashing-3d-visualizer/
├── index.html                 # Entry point, loads all scripts
├── styles/
│   └── main.css              # Modern dark theme UI styles
├── js/
│   ├── core/                 # Core data structures
│   │   ├── Page.js           # Virtual memory page
│   │   ├── Frame.js          # Physical RAM frame
│   │   ├── DiskBlock.js      # Swap space block
│   │   ├── Process.js        # Process with pages
│   │   └── SwapSystem.js     # Swap space manager
│   ├── policies/             # Page replacement algorithms
│   │   ├── PolicyInterface.js # Abstract base class
│   │   ├── FIFO.js           # First-In-First-Out
│   │   └── LRU.js            # Least Recently Used
│   ├── simulation/           # Simulation engine
│   │   ├── Scenarios.js      # Built-in workload scenarios
│   │   ├── WorkloadGenerator.js # Memory access patterns
│   │   └── SimulationEngine.js # Main orchestrator
│   ├── rendering/            # Three.js visualization
│   │   ├── SceneManager.js   # Scene, camera, lights
│   │   ├── RAMVisualizer.js  # RAM grid rendering
│   │   ├── DiskVisualizer.js # Disk platter rendering
│   │   ├── PageRenderer.js   # Page block rendering
│   │   └── EffectsManager.js # Particles, thrashing effects
│   ├── ui/                   # User interface
│   │   ├── KPIDashboard.js   # Real-time statistics
│   │   ├── Controls.js       # Playback controls
│   │   ├── EventLog.js       # Event timeline
│   │   └── ScenarioSelector.js # Scenario dropdown
│   └── main.js               # Application entry point
└── README.md                 # Quick start guide
```

---

## 4. Data Structures Implementation

### 4.1 Page (Virtual Memory Page)

**Purpose**: Represents a single page in virtual memory.

**File**: `js/core/Page.js`

**Properties**:
```javascript
class Page {
    constructor(id, processId, processName) {
        // Identification
        this.id = id;                        // Unique page ID
        this.processId = processId;          // Owner process ID
        this.processName = processName;      // Owner process name
        this.virtualAddress = id * 4096;     // Virtual address (4KB pages)

        // Location tracking
        this.frameId = null;                 // Physical frame (if in RAM)
        this.diskBlockId = null;             // Disk block (if swapped)
        this.location = 'none';              // 'ram' | 'disk' | 'none'

        // Page replacement metadata
        this.lastAccessTime = 0;             // For LRU algorithm
        this.loadTime = 0;                   // For FIFO algorithm
        this.accessCount = 0;                // For LFU algorithm
        this.referenceBit = 0;               // For Clock algorithm
        this.modifiedBit = false;            // Dirty bit

        // Visualization
        this.mesh = null;                    // Three.js mesh reference
        this.color = null;                   // Process color
    }
}
```

**State Transitions**:
```
        ┌─────────────────┐
        │     NONE        │  (Initial state)
        └────────┬────────┘
                 │ allocate
                 ▼
        ┌─────────────────┐
   ┌────│      RAM        │────┐
   │    └─────────────────┘    │
   │             ▲              │
   │ swap-in     │              │ swap-out
   │             │              │
   │    ┌────────┴────────┐    │
   └───▶│     DISK        │◀───┘
        └─────────────────┘
```

### 4.2 Frame (Physical RAM Frame)

**Purpose**: Represents a single frame in physical memory.

**File**: `js/core/Frame.js`

```javascript
class Frame {
    constructor(id) {
        this.id = id;                    // Frame number
        this.page = null;                // Currently held page
        this.isFree = true;              // Allocation status
        
        // 3D position for visualization
        this.position = { x: 0, y: 0, z: 0 };
    }

    allocate(page) {
        this.page = page;
        this.isFree = false;
    }

    free() {
        this.page = null;
        this.isFree = true;
    }
}
```

**Memory Layout (in SimulationEngine)**:
```javascript
// Frame array layout (grid-based)
initializeFrames() {
    for (let i = 0; i < this.config.ramFrames; i++) {
        const frame = new Frame(i);
        // Calculate 3D grid position
        const cols = Math.ceil(Math.sqrt(this.config.ramFrames));
        frame.position = {
            x: (i % cols) - cols / 2,
            y: 0,
            z: Math.floor(i / cols) - cols / 2
        };
        this.frames.push(frame);
        this.freeFrames.push(frame);  // Initially all free
    }
}
```

### 4.3 DiskBlock (Swap Space Block)

**Purpose**: Represents a block in the swap partition on disk.

**File**: `js/core/DiskBlock.js`

```javascript
class DiskBlock {
    constructor(id) {
        this.id = id;
        this.page = null;
        this.isFree = true;
        
        // Circular platter positioning (for visualization)
        this.angle = 0;      // Radians on disk
        this.radius = 0;     // Distance from center
    }
}
```

### 4.4 Process

**Purpose**: Represents a running process with its virtual memory pages.

**File**: `js/core/Process.js`

```javascript
class Process {
    constructor(id, name, pageCount, options = {}) {
        this.id = id;
        this.name = name;
        this.pageCount = pageCount;
        this.pages = [];                      // Array of Page objects
        
        // Workload characteristics
        this.locality = options.locality || 0.7;
        this.workingSetSize = options.workingSetSize || 
                              Math.ceil(pageCount * 0.4);
        
        // Statistics
        this.totalAccesses = 0;
        this.pageFaults = 0;
        
        // Visualization
        this.color = this.generateColor();
    }

    // Generate unique color using golden angle
    generateColor() {
        const hue = (this.id * 137.508) % 360;  // Golden angle
        return `hsl(${hue}, 70%, 60%)`;
    }

    // Create all pages for this process
    createPages(startId) {
        for (let i = 0; i < this.pageCount; i++) {
            const page = new Page(startId + i, this.id, this.name);
            page.color = this.color;
            this.pages.push(page);
        }
        return this.pages;
    }
}
```

### 4.5 SwapSystem

**Purpose**: Manages the swap partition, allocation/deallocation, and I/O statistics.

**File**: `js/core/SwapSystem.js`

**Key Data Structures**:
- **blocks[]**: Array of all DiskBlock objects
- **freeBlocks[]**: Stack/Queue of available blocks
- **ioOperations[]**: Recent I/O with timestamps for rate calculation

```javascript
class SwapSystem {
    constructor(blockCount) {
        this.blockCount = blockCount;
        this.blocks = [];
        this.freeBlocks = [];
        
        // I/O Statistics
        this.swapInCount = 0;
        this.swapOutCount = 0;
        this.ioOperations = [];
        this.ioWindow = 1000;  // 1 second window for rate calculation
    }

    // Get I/O rate using sliding window
    getIORate() {
        const now = Date.now();
        const recentOps = this.ioOperations.filter(
            op => now - op.time < this.ioWindow
        );
        return (recentOps.length / this.ioWindow) * 1000;  // ops/second
    }
}
```

---

## 5. Algorithm Implementations

### 5.1 LRU with O(1) Operations

**Challenge**: Standard LRU requires O(n) to find the least recently used page.

**Solution**: Combine two data structures:
1. **Doubly Linked List**: Maintains order (head = MRU, tail = LRU)
2. **HashMap**: Provides O(1) lookup of nodes

**Operation Complexity**:
| Operation | Time |
|-----------|------|
| Access (move to front) | O(1) |
| Select victim (get tail) | O(1) |
| Insert new page | O(1) |
| Remove evicted page | O(1) |

**Visual Representation**:
```
HashMap                  Doubly Linked List
┌─────────────┐         
│ P1 → Node1  │         HEAD                           TAIL
│ P2 → Node2  │────────▶┌──────┐◀─▶┌──────┐◀─▶┌──────┐
│ P3 → Node3  │         │ P3   │   │ P1   │   │ P2   │
│ ...         │         │(MRU) │   │      │   │(LRU) │
└─────────────┘         └──────┘   └──────┘   └──────┘
                            ▲                      │
                            │    Move on Access    │
                            └──────────────────────┘
```

### 5.2 Workload Generation with Locality

**Algorithm**: Weighted random page selection based on locality factor.

```javascript
// WorkloadGenerator.js
generateAccess() {
    // Select random process weighted by page count
    const totalPages = this.processes.reduce((sum, p) => sum + p.pageCount, 0);
    let random = Math.random() * totalPages;
    
    let selectedProcess;
    for (const process of this.processes) {
        random -= process.pageCount;
        if (random <= 0) {
            selectedProcess = process;
            break;
        }
    }
    
    // Get page based on locality (in Process class)
    const page = selectedProcess.getRandomPageToAccess();
    return { process: selectedProcess, page };
}
```

### 5.3 Thrashing Detection Algorithm

```javascript
// SimulationEngine.js
checkThrashing() {
    // Get swap I/O rate (ops/second)
    const ioRate = this.swapSystem.getIORate();
    
    // Compare against threshold
    const wasThrashing = this.isThrashing;
    this.isThrashing = ioRate >= this.thrashingThreshold;  // Default: 5 ops/s
    
    // Trigger state change callback
    if (wasThrashing !== this.isThrashing) {
        if (this.callbacks.onThrashingChange) {
            this.callbacks.onThrashingChange(this.isThrashing);
        }
    }
}
```

---

## 6. Simulation Engine

### 6.1 Core Event Loop

**File**: `js/simulation/SimulationEngine.js`

The simulation uses `requestAnimationFrame` for smooth animation-synchronized execution.

```javascript
runLoop() {
    if (!this.isRunning || this.isPaused) return;

    const now = Date.now();
    const elapsed = now - this.lastStepTime;
    const effectiveInterval = this.config.accessInterval / this.speed;

    if (elapsed >= effectiveInterval) {
        this.step();  // Execute one simulation step
        this.lastStepTime = now;
    }

    this.animationFrameId = requestAnimationFrame(() => this.runLoop());
}
```

### 6.2 Simulation Step Execution

```javascript
step() {
    // 1. Generate memory accesses based on workload
    const accesses = this.workloadGenerator.generateBatch(1);

    // 2. Process each access
    for (const access of accesses) {
        this.accessPage(access.page);  // May trigger page fault
    }

    // 3. Advance simulation time
    this.simulationTime += this.config.accessInterval;

    // 4. Check for thrashing
    this.checkThrashing();

    // 5. Update statistics and notify UI
    if (this.callbacks.onStatsUpdate) {
        this.callbacks.onStatsUpdate(this.getStats());
    }
}
```

### 6.3 Event Callback System

The engine uses a publish-subscribe pattern for loose coupling with the UI:

```javascript
// Callback registration
this.callbacks = {
    onPageAllocated: null,      // Page loaded into RAM
    onPageEvicted: null,         // Page removed from RAM
    onPageSwappedIn: null,       // Page loaded from disk
    onPageSwappedOut: null,      // Page written to disk
    onPageAccessed: null,        // Page hit in RAM
    onPageFault: null,           // Page not found in RAM
    onThrashingChange: null,     // Thrashing state changed
    onStatsUpdate: null,         // Statistics updated
    onProcessAdded: null,        // New process added
    onSimulationStep: null       // Step completed
};

// Callback registration method
on(event, callback) {
    if (this.callbacks.hasOwnProperty(event)) {
        this.callbacks[event] = callback;
    }
}
```

### 6.4 Statistics Collection

```javascript
getStats() {
    return {
        // Page faults
        totalPageFaults: this.stats.totalPageFaults,
        pageFaultsPerSecond: this.stats.pageFaultsThisSecond,

        // Swap operations
        swapInCount: this.stats.swapInCount,
        swapOutCount: this.stats.swapOutCount,
        diskIORate: this.swapSystem.getIORate(),

        // Memory usage
        ramUsed: this.frames.filter(f => f.isOccupied()).length,
        ramTotal: this.config.ramFrames,
        ramUtilization: ramUsage / this.config.ramFrames * 100,
        swapUsed: this.swapSystem.getUsedCount(),
        swapTotal: this.swapSystem.blockCount,

        // Performance
        memoryAccesses: this.stats.memoryAccesses,
        hitCount: this.stats.hitCount,
        hitRatio: (this.stats.hitCount / this.stats.memoryAccesses * 100).toFixed(1),

        // Thrashing
        isThrashing: this.isThrashing,
        thrashingLevel: Math.min(100, (ioRate / this.thrashingThreshold) * 100),

        // Meta
        simulationTime: this.simulationTime,
        currentPolicy: this.policy.getName()
    };
}
```

---

## 7. Visualization Pipeline

### 7.1 Three.js Scene Setup

**File**: `js/rendering/SceneManager.js`

```javascript
initialize() {
    // Create scene with dark background
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a1a);

    // Perspective camera
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
    this.camera.position.set(15, 20, 25);
    this.camera.lookAt(0, 0, 0);

    // WebGL renderer with antialiasing
    this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;

    // Orbit controls for interactive camera
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
}
```

### 7.2 RAM Visualization (Grid Layout)

**File**: `js/rendering/RAMVisualizer.js`

RAM is visualized as a rectangular grid of frame slots:

```javascript
createFrameSlots() {
    const cols = Math.ceil(Math.sqrt(this.frameCount));
    const rows = Math.ceil(this.frameCount / cols);
    
    for (let i = 0; i < this.frameCount; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        
        const x = (col - cols / 2 + 0.5) * this.spacing;
        const z = (row - rows / 2 + 0.5) * this.spacing;
        
        // Create slot mesh (low box)
        const slot = new THREE.Mesh(
            new THREE.BoxGeometry(0.9, 0.1, 0.9),
            new THREE.MeshStandardMaterial({ color: 0x2a8c5a, opacity: 0.5 })
        );
        slot.position.set(x, this.baseY, z);
        this.group.add(slot);
    }
}
```

### 7.3 Disk Visualization (Circular Platter)

**File**: `js/rendering/DiskVisualizer.js`

Disk is visualized as a spinning circular platter with concentric rings:

```javascript
createBlockSlots() {
    const blocksPerRing = Math.ceil(this.blockCount / this.rings);
    
    for (let i = 0; i < this.blockCount; i++) {
        const ringIndex = Math.floor(i / blocksPerRing);
        const posInRing = i % blocksPerRing;
        
        // Calculate polar coordinates
        const angle = (posInRing / blocksPerRing) * Math.PI * 2;
        const radius = this.innerRadius + (ringIndex + 0.5) * ringWidth;
        
        // Convert to Cartesian
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        
        // Create cylindrical slot
        const slot = new THREE.Mesh(
            new THREE.CylinderGeometry(0.25, 0.25, 0.1, 8),
            new THREE.MeshStandardMaterial({ color: 0x2563eb })
        );
        slot.position.set(x, this.baseY + 0.2, z);
    }
}
```

### 7.4 Page Transfer Animation (Bezier Curves)

**File**: `js/rendering/PageRenderer.js`

Page transfers use quadratic Bezier curves for smooth arc motion:

```javascript
animateSwapOut(page, sourceFrame, targetBlock, onComplete) {
    const mesh = this.pageMeshes.get(page.id);
    const startPos = mesh.position.clone();
    const endPos = this.diskVisualizer.getBlockPosition(targetBlock.id);
    
    // Arc midpoint (above both start and end)
    const midPoint = new THREE.Vector3(
        (startPos.x + endPos.x) / 2,
        Math.max(startPos.y, endPos.y) + 4,  // Arc height
        (startPos.z + endPos.z) / 2
    );

    const duration = 800;  // milliseconds
    const startTime = Date.now();

    const animate = () => {
        const t = Math.min((Date.now() - startTime) / duration, 1);
        
        // Quadratic Bezier formula: B(t) = (1-t)²P0 + 2(1-t)tP1 + t²P2
        const t1 = 1 - t;
        mesh.position.x = t1*t1*startPos.x + 2*t1*t*midPoint.x + t*t*endPos.x;
        mesh.position.y = t1*t1*startPos.y + 2*t1*t*midPoint.y + t*t*endPos.y;
        mesh.position.z = t1*t1*startPos.z + 2*t1*t*midPoint.z + t*t*endPos.z;
        
        // Rotate during transfer
        mesh.rotation.y += 0.1;

        if (t < 1) {
            requestAnimationFrame(animate);
        } else {
            onComplete && onComplete();
        }
    };
    animate();
}
```

### 7.5 Thrashing Visual Effects

**File**: `js/rendering/EffectsManager.js`

When thrashing is detected:
1. **Particle System**: Orange/red swirling particles
2. **Camera Shake**: Random position offset

```javascript
// Particle system creation
createParticleSystem() {
    const positions = new Float32Array(this.particleCount * 3);
    const colors = new Float32Array(this.particleCount * 3);
    
    for (let i = 0; i < this.particleCount; i++) {
        // Spherical distribution
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        const radius = 5 + Math.random() * 15;
        
        positions[i*3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i*3+1] = radius * Math.cos(phi);
        positions[i*3+2] = radius * Math.sin(phi) * Math.sin(theta);
        
        // Random color between red (0xff4444) and orange (0xff8800)
        // ...
    }
    
    this.particles = new THREE.Points(geometry, material);
}

// Animation loop
update() {
    if (this.isThrashing && this.particles.visible) {
        // Swirl particles
        const positions = this.particles.geometry.attributes.position.array;
        for (let i = 0; i < this.particleCount; i++) {
            const angle = Math.atan2(positions[i*3+2], positions[i*3]);
            const newAngle = angle + 0.02;  // Rotation speed
            const radius = Math.sqrt(positions[i*3]**2 + positions[i*3+2]**2);
            positions[i*3] = radius * Math.cos(newAngle);
            positions[i*3+2] = radius * Math.sin(newAngle);
        }
        this.particles.geometry.attributes.position.needsUpdate = true;
    }

    // Camera shake
    if (this.isThrashing && this.camera) {
        this.camera.position.x += (Math.random() - 0.5) * this.shakeIntensity;
        this.camera.position.y += (Math.random() - 0.5) * this.shakeIntensity;
        this.camera.position.z += (Math.random() - 0.5) * this.shakeIntensity;
    }
}
```

---

## 8. API Reference

### 8.1 Public JavaScript API

The visualizer exposes a global API for programmatic control:

```javascript
// Global instance
window.visualizer

// Load a scenario
visualizer.loadScenario('light');    // String ID
visualizer.loadScenario(scenario);    // Object

// Playback control
visualizer.play();    // Start simulation
visualizer.pause();   // Pause simulation
visualizer.step();    // Execute one step
visualizer.reset();   // Reset to initial state

// Configuration
visualizer.setSpeed(2.0);         // 2x speed
visualizer.setIntensity(1.5);     // Higher workload

// Statistics
const stats = visualizer.getStats();
console.log(stats.totalPageFaults);
console.log(stats.hitRatio);
console.log(stats.isThrashing);

// Add custom process
visualizer.addProcess('MyApp', 15, { locality: 0.6 });
```

### 8.2 Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play/Pause simulation |
| `→ (Right Arrow)` | Single step |
| `R` | Reset simulation |
| `1` | Load Light scenario |
| `2` | Load Balanced scenario |
| `3` | Load Heavy scenario |
| `Mouse drag` | Rotate camera |
| `Scroll` | Zoom in/out |

### 8.3 Scenario Configuration Schema

```javascript
{
    id: 'custom',
    name: 'My Scenario',
    description: 'Description text',
    icon: '🔧',
    config: {
        ramFrames: 32,           // Number of RAM frames
        swapBlocks: 64,          // Number of swap blocks
        pageSize: 4,             // KB (symbolic)
        accessInterval: 300,      // ms between accesses
        policy: 'LRU'            // 'LRU' | 'FIFO'
    },
    processes: [
        {
            name: 'Process 1',
            pages: 10,            // Number of pages
            locality: 0.7,        // 0-1, higher = better locality
            icon: '📦'
        }
    ]
}
```

---

## 9. Performance Analysis

### 9.1 KPI Definitions

| KPI | Formula | Meaning |
|-----|---------|---------|
| **Total Page Faults** | Count of faults | Pages not found in RAM |
| **Faults/Second** | Faults in last 1s | Current fault rate |
| **Hit Ratio** | `hitCount / memoryAccesses × 100%` | RAM efficiency |
| **Swap I/O Rate** | Swap ops in last 1s / 1s | Disk activity |
| **Thrashing Level** | `ioRate / threshold × 100%` | Thrashing intensity |
| **RAM Utilization** | `usedFrames / totalFrames × 100%` | Memory pressure |

### 9.2 Expected Results by Scenario

| Scenario | Page Faults | Hit Ratio | Thrashing |
|----------|-------------|-----------|-----------|
| Light | Very Low | 90%+ | None |
| Balanced | Moderate | 70-85% | Occasional |
| Heavy | High | 40-60% | Constant |

### 9.3 Algorithm Comparison

Run with identical workload, comparing FIFO vs LRU:

| Metric | FIFO | LRU |
|--------|------|-----|
| Page Faults | Higher | Lower |
| Hit Ratio | Lower | Higher |
| Anomaly Risk | Yes | No |
| Implementation | Simpler | Complex |

---

## 10. Educational Scenarios

### 10.1 Light Workload

**Purpose**: Demonstrate stable system with good locality

**Configuration**:
- 32 RAM frames (plenty of space)
- 2 small processes with high locality (0.9)

**Expected Observation**:
- Minimal page faults
- High hit ratio (>90%)
- No thrashing

### 10.2 Balanced Workload

**Purpose**: Show normal system operation with occasional paging

**Configuration**:
- 24 RAM frames (moderate)
- 2 medium processes with moderate locality (0.6-0.7)

**Expected Observation**:
- Moderate page faults
- Pages smoothly transfer between RAM and disk
- No thrashing

### 10.3 Heavy Workload (Thrashing Demo)

**Purpose**: Demonstrate thrashing

**Configuration**:
- 16 RAM frames (limited)
- 3+ large processes with poor locality (0.3-0.4)

**Expected Observation**:
- Continuous swap activity
- Very low hit ratio
- Thrashing effects activated (particles, shake)

### 10.4 FIFO Anomaly Demo

**Purpose**: Show Belady's anomaly

**Configuration**:
- 12 RAM frames
- FIFO algorithm
- Single process with poor locality

### 10.5 Locality Comparison

**Purpose**: Compare high vs low locality processes

**Configuration**:
- 20 RAM frames
- Process A: 15 pages, locality 0.95
- Process B: 15 pages, locality 0.2

**Expected Observation**:
- Process A has far fewer page faults
- Process B causes most of the swap activity

---

## 11. How Concepts Map to Real OS Kernels

### 11.1 Linux Kernel Equivalents

| This Project | Linux Kernel |
|--------------|--------------|
| `Page` class | `struct page` in `mm_types.h` |
| `Frame` | `mem_map` array entry |
| `DiskBlock` | Swap slot in swap area |
| `SwapSystem` | `swapinfo` + `swap_avail` |
| `SimulationEngine.handlePageFault()` | `do_page_fault()` |
| `LRU.selectVictim()` | `page_lru()` + `vmscan.c` |
| `Page.referenceBit` | PTE accessed bit |
| `Page.modifiedBit` | PTE dirty bit |

### 11.2 System Calls Simulated

| Kernel Operation | This Project |
|-----------------|--------------|
| `mmap()` / page allocation | `SimulationEngine.allocatePageToFrame()` |
| Page fault handler | `SimulationEngine.handlePageFault()` |
| `swapper` daemon | `SimulationEngine.evictPage()` |
| OOM killer | Not implemented (swap fills instead) |

### 11.3 Hardware Concepts Abstracted

| Hardware Component | Visualization |
|-------------------|---------------|
| MMU (Memory Management Unit) | Implicit in page lookup |
| TLB (Translation Lookaside Buffer) | Not visualized |
| Page Table | `allPages` Map + page.frameId |
| Disk I/O | Animated page transfer |

---

## Appendix A: Project Setup

### Prerequisites
- Modern web browser (Chrome 80+, Firefox 75+, Edge 80+)
- No build tools required (pure HTML/JS/CSS)

### Running the Project
1. Clone or download the project
2. Open `index.html` in a browser
3. Select a scenario and click "Load"
4. Press Play or Space to start

### File Dependencies
```html
<!-- External CDN -->
<script src="three.min.js"></script>
<script src="OrbitControls.js"></script>

<!-- Project files (in order) -->
<script src="js/core/Page.js"></script>
<script src="js/core/Frame.js"></script>
<!-- ... other files in dependency order ... -->
<script src="js/main.js"></script>  <!-- Last -->
```

---

## Appendix B: Extending the Project

### Adding a New Page Replacement Algorithm

1. Create `js/policies/MyPolicy.js`:
```javascript
class MyPolicy extends PolicyInterface {
    constructor() {
        super('MyPolicy');
    }

    selectVictim(ramPages) {
        // Your victim selection logic
        return victimPage;
    }

    onPageAccess(page, timestamp) {
        super.onPageAccess(page, timestamp);
        // Update your data structures
    }

    onPageLoad(page, timestamp) {
        // Initialize tracking for new page
    }

    onEvict(page) {
        // Clean up when page is evicted
    }
}

window.MyPolicy = MyPolicy;
```

2. Register in `SimulationEngine.js`:
```javascript
setPolicy(policyName) {
    switch (policyName.toUpperCase()) {
        case 'MYPOLICY':
            this.policy = new MyPolicy();
            break;
        // ...
    }
}
```

3. Add to `index.html`:
```html
<script src="js/policies/MyPolicy.js"></script>
```

### Adding New Scenarios

Edit `js/simulation/Scenarios.js`:
```javascript
const SCENARIOS = {
    // ... existing scenarios ...
    
    myScenario: {
        id: 'myScenario',
        name: 'My Custom Scenario',
        description: 'Testing specific behavior',
        icon: '🔧',
        config: { /* ... */ },
        processes: [ /* ... */ ]
    }
};
```

---

## Appendix C: Glossary

| Term | Definition |
|------|------------|
| **Frame** | Fixed-size block of physical memory |
| **Page** | Fixed-size block of virtual memory |
| **Page Fault** | Access to page not in RAM |
| **Page Table** | Mapping of virtual pages to physical frames |
| **Swapping** | Moving pages between RAM and disk |
| **Thrashing** | Excessive swapping, CPU starvation |
| **Working Set** | Pages actively used by a process |
| **Locality** | Tendency to access nearby/recent addresses |
| **LRU** | Least Recently Used (replacement algorithm) |
| **FIFO** | First-In-First-Out (replacement algorithm) |
| **Hit Ratio** | Percentage of accesses found in RAM |
| **Belady's Anomaly** | More frames causing more faults (FIFO only) |

---

**Document Version**: 1.0  
**Last Updated**: February 2026  
**Project**: Operating Systems Laboratory - Memory Management Visualization
