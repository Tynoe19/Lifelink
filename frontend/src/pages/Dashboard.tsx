import SharedDashboard from '../components/Dashboard/SharedDashboard';
import { Outlet } from 'react-router-dom';

const DashboardPage = () => {
    return (
        <SharedDashboard>
            <Outlet />
        </SharedDashboard>
    );
};

export default DashboardPage;
