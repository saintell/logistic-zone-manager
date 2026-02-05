import './styles/globals.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { UploadBatchesPage } from './features/upload-batches/UploadBatchesPage';
import { ZonesPage } from './features/zones/ZonesPage';
import { BatchProcessingProvider } from './features/upload-batches/context/BatchProcessingContext';

function App() {
  return (
    <BrowserRouter>
      <BatchProcessingProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<UploadBatchesPage />} />
            <Route path="/zones" element={<ZonesPage />} />
          </Routes>
        </Layout>
      </BatchProcessingProvider>
    </BrowserRouter>
  );
}

export default App;
