import './styles/globals.css';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { UploadBatchesPage } from './features/upload-batches/UploadBatchesPage';
import { ZonesPage } from './features/zones/ZonesPage';
import { BatchProcessingProvider } from './features/upload-batches/context/BatchProcessingContext';

function App() {
  return (
    <HashRouter>
      <BatchProcessingProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<UploadBatchesPage />} />
            <Route path="/zones" element={<ZonesPage />} />
          </Routes>
        </Layout>
      </BatchProcessingProvider>
    </HashRouter>
  );
}

export default App;
