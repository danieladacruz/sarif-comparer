# SARIF Compare

A web application (available here: https://sarif-comparer.netlify.app/) for analyzing and comparing SARIF (Static Analysis Results Interchange Format) files. This tool helps developers and security teams visualize, analyze, and compare results from different static analysis tools or multiple scans.

<img width="783" alt="Screenshot 2025-01-31 at 11 27 59" src="https://github.com/user-attachments/assets/d6183553-e8b4-418c-841b-6c39e020d66e" />


## Features

- 📊 **Visual Analysis**: Clear, interactive visualization of SARIF results
- 🔄 **Multi-File Comparison**: Compare up to 3 SARIF files simultaneously
- 📈 **CWE Analysis**: Group and analyze findings by Common Weakness Enumeration (CWE)
- 📉 **Overlap Analysis**: Calculate and display result overlaps between different scans
- 📱 **Responsive Design**: Full support for mobile and desktop views
- 📤 **Export Functionality**: Export analysis results to Excel

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/sarif-compare.git
cd sarif-compare
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

### Building for Production

To create a production build:

```bash
npm run build
```

The built files will be in the `dist` directory.

## Usage

1. **Upload SARIF Files**:
   - Click the upload area or drag and drop SARIF files
   - Upload up to 3 files for comparison

2. **View Analysis**:
   - **Summary Tab**: Overview of findings with severity levels
   - **CWE Analysis**: Grouped findings by CWE categories
   - **Detailed Results**: Complete list of all findings

3. **Export Results**:
   - Use the Export to Excel button to download analysis results
   - Compare findings across different scans

## Technologies Used

- React
- TypeScript
- Tailwind CSS
- Vite
- XLSX for Excel export
- Lucide React for icons

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with [Vite](https://vitejs.dev/)
- Icons by [Lucide](https://lucide.dev/)
- Styling with [Tailwind CSS](https://tailwindcss.com/)
