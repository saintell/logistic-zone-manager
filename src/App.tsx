import './styles/globals.css';
import { Layout } from './components/layout/Layout';
import { UploadBatchesPage } from './features/upload-batches/UploadBatchesPage';

function App() {
  return (
    <Layout>
      <UploadBatchesPage />
    </Layout>
  );
}

export default App;
