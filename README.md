# SentinelX — Cybersecurity Operations Platform

SentinelX is a cybersecurity portfolio project designed to help monitor security events, identify potential threats, and manage incidents through a centralized dashboard.

## Features

- **Security Event Ingestion:** Receive security events through backend REST APIs.
- **Threat Detection:** Apply rule-based logic to classify event severity.
- **Automated Incident Creation:** Create incidents automatically for critical security events.
- **Incident Management:** Track and manage security incidents.
- **Attack Timeline:** Visualize security activity over time.
- **Attack Chain Visualization:** Organize related activity to support investigations.
- **Threat Intelligence Interface:** Access the threat intelligence section of the dashboard.
- **WebSocket/STOMP Alerts:** Backend alert broadcasting is implemented; end-to-end browser connectivity is still under development.

## Technology Stack

### Backend
- Java 17
- Spring Boot
- Spring Data MongoDB
- MongoDB
- REST APIs
- WebSocket / STOMP

### Frontend
- React
- TypeScript
- Vite
- Recharts
- CSS

## Project Structure

```text
SentinelX/
├── sentinelx-backend/
│   ├── src/
│   ├── pom.xml
│   └── mvnw.cmd
├── sentinelx-frontend/
│   ├── src/
│   ├── public/
│   └── package.json
├── .gitignore
└── README.md
```

## Prerequisites

- JDK 17
- Node.js and npm
- MongoDB
- Git

## Run the Frontend

From the repository root, open PowerShell and run:

```powershell
cd sentinelx-frontend
npm install
npm run dev
```

Open the local URL displayed by Vite in your terminal.

## Run the Backend

Configure JDK 17 and MongoDB first. From the repository root, run:

```powershell
cd sentinelx-backend
.\mvnw.cmd spring-boot:run
```

The backend is configured to run at `http://localhost:8080`.

The default local MongoDB database is `sentinelx`. Review `src/main/resources/application.properties` and configure the database connection for your environment.

## Development Status

SentinelX is an actively developed portfolio project. Core event processing, rule-based threat classification, critical incident creation, and dashboard interfaces have been implemented. WebSocket live-alert connectivity is still being troubleshot.

The platform processes events supplied through supported ingestion mechanisms; it does not claim to automatically monitor all network traffic.

## Security Notes

- Never commit passwords, API keys, access tokens, or private credentials.
- Keep environment-specific secrets out of version control.
- Configure authentication, authorization, and secure deployment settings before production use.
- Test only with systems and data you are authorized to use.

## Future Enhancements

- Complete and verify end-to-end live alert delivery.
- Add authentication and role-based access control.
- Improve anomaly detection with machine learning.
- Expand attack-chain reconstruction and investigation workflows.
- Add automated testing and deployment support.

## Disclaimer

SentinelX is intended for educational, defensive cybersecurity, and portfolio purposes
