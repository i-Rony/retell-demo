# AI Voice Agent Demo

This is a demo for an AI Voice Agent administrative tool built with React, TypeScript, Vite, Tailwind CSS and FastAPI.

## ✅ Completed Features

### 🏗️ Core Infrastructure
- ✅ React + TypeScript + Vite setup with hot reload
- ✅ Tailwind CSS v4 with complete design system
- ✅ shadcn/ui component library integration
- ✅ Responsive layout with header, sidebar navigation
- ✅ Dark/light theme toggle with persistence
- ✅ Toast notification system

### 🤖 Agent Configuration
- ✅ Agent overview dashboard with stats
- ✅ Comprehensive agent configuration form with 5 tabs:
  - **Basic Info**: Name, description, voice selection
  - **Prompts**: System prompt and boosted keywords
  - **Voice & Audio**: Temperature, speed, volume controls
  - **Behavior**: Backchannel, interruption settings
  - **Advanced**: Pronunciation dictionary
- ✅ Interactive sliders and switches for fine-tuning
- ✅ Form validation and success notifications
- ✅ Agent creation and editing workflows

### 📞 Call Triggering
- ✅ Multi-step call configuration form
- ✅ Driver information capture (name, phone, load number)
- ✅ Load details (pickup/delivery locations, timing)
- ✅ Agent and scenario selection
- ✅ Phone number formatting and validation
- ✅ Call preview modal with confirmation
- ✅ Call progress simulation with loading states
- ✅ Recent calls history with status indicators

### 📊 Call Results & Analytics
- ✅ Real-time stats dashboard (total calls, success rate, avg duration)
- ✅ Advanced search and filtering capabilities
- ✅ Detailed call history with status indicators
- ✅ Comprehensive call detail modals with 3 tabs:
  - **Summary**: Call information and confidence scoring
  - **Transcript**: Chat-like conversation view
  - **Extracted Data**: Structured location and status data
- ✅ Mock data for realistic demo experience

### 🎨 UI/UX Excellence
- ✅ Fully responsive design (mobile, tablet, desktop)
- ✅ Consistent design language with proper spacing
- ✅ Loading states and progress indicators
- ✅ Success/error toast notifications
- ✅ Hover effects and smooth transitions
- ✅ Professional color scheme and typography

## 🗃️ Mock Data Included

The demo includes realistic mock data for:
- **2 Pre-configured Agents**: Driver Check-in and Emergency Protocol
- **3 Sample Calls**: Completed, failed, and in-progress calls
- **Full Transcripts**: Realistic conversations between agents and drivers
- **Extracted Data**: Location, ETA, status, and issues from calls
- **Performance Metrics**: Success rates, durations, and trends

## 🚀 Running the Demo

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## 🔮 Backend Integration Ready

The demo is architected for easy backend integration:
- Component structure supports API data fetching
- Form handling ready for validation and submission
- State management patterns established
- Mock data structure matches expected API responses
- Error handling patterns in place

## 🎯 Demo Scenarios

### Agent Configuration
1. **Create New Agent**: Click "Create Agent" to set up a new voice agent
2. **Edit Existing Agent**: Click on an agent card and use the edit button
3. **Voice Preview**: Test different voice settings and parameters
4. **Advanced Settings**: Configure backchannel and pronunciation

### Call Testing
1. **Driver Check-in Call**: Fill out driver details and initiate a test call
2. **Emergency Protocol**: Test emergency response scenarios
3. **Call Preview**: Review all details before initiating
4. **Real-time Progress**: Watch call progress with loading indicators

### Results Analysis
1. **Search & Filter**: Find specific calls by driver or load number
2. **Call Details**: View detailed information including transcripts
3. **Extracted Data**: See structured data extracted from conversations
4. **Performance Metrics**: Monitor success rates and call durations

## 🛠️ Technology Stack

- **Frontend Framework**: React 19 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui + Radix UI primitives
- **Icons**: Lucide React
- **Form Handling**: React Hook Form + Zod validation
- **State Management**: React useState (Zustand ready for backend)

## 📱 Responsive Design

The demo is fully responsive and works seamlessly on:
- 📱 Mobile devices (320px+)
- 📱 Tablets (768px+)
- 💻 Desktop (1024px+)
- 🖥️ Large screens (1440px+)

## 🎨 Design Features

- **Modern UI**: Clean, professional interface design
- **Dark/Light Mode**: Full theme switching with system preference detection
- **Accessibility**: ARIA labels and keyboard navigation support
- **Loading States**: Comprehensive loading and progress indicators
- **Toast Notifications**: Success and error feedback system
- **Micro-interactions**: Smooth transitions and hover effects

