import './styles/globals.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { UploadBatchesPage } from './features/upload-batches/UploadBatchesPage';
import { ZonesPage } from './features/zones/ZonesPage';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<UploadBatchesPage />} />
          <Route path="/zones" element={<ZonesPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
