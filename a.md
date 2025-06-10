graph LR
    %% Define Styles
    classDef cloud fill:#D6EAF8,stroke:#3498DB,stroke-width:2px;
    classDef onprem fill:#E8DAEF,stroke:#8E44AD,stroke-width:2px;
    classDef user fill:#FEF9E7,stroke:#F39C12,stroke-width:2px;
    classDef external fill:#E5E7E9,stroke:#566573,stroke-width:2px;
    classDef devops fill:#D5F5E3,stroke:#2ECC71,stroke-width:2px;

    %% Users
    U[Users <br>(Julia, Torsten)]:::user

    subgraph "Cloud Platform"
        direction LR
        subgraph "Azure"
            direction TB
            AAS[Nexus / Planner <br>Next.js App (App Service)]:::cloud
            ACR[Azure Container Registry]:::cloud
            CloudDB[(Future) Cloud Database <br>(Azure SQL / CosmosDB)]:::cloud
            MatrixNotifAPI[(Future) Matrix Notification API)]:::cloud
        end
        subgraph "Google Cloud (External AI)"
            direction TB
            GAI[Google AI Platform <br>(Gemini Models)]:::external
        end
    end

    subgraph "On-Premise (Klinikum Gütersloh)"
        direction TB
        KIS_Adapter[KIS Adapter API <br>(Provided by Hospital IT)]:::onprem
        KIS_DB[KIS Database <br>(Hospital System)]:::onprem
    end

    subgraph "DevOps & Source Control"
        direction TB
        GH[GitHub Repository <br>(Source Code, Dockerfile)]:::devops
        GHA[GitHub Actions CI/CD]:::devops
    end

    subgraph "Future External Integrations"
        direction TB
        MatrixBot[(Future) Matrix Bot]:::external
    end

    %% User Interaction
    U -- HTTPS --> AAS

    %% Application Core & AI
    AAS -- Serves Frontend/Backend --> U
    AAS -- Genkit HTTPS API Call --> GAI

    %% Data Integration
    AAS -- HTTPS API Call <br>(Secure Connection) --> KIS_Adapter
    KIS_Adapter -- Internal Network --> KIS_DB
    AAS -.-> CloudDB

    %% DevOps Flow
    GH -- Triggers --> GHA
    GHA -- Pulls Code --> GH
    GHA -- Builds & Pushes Docker Image --> ACR
    GHA -- Deploys Container --> AAS
    ACR -- Stores Docker Images --> AAS

    %% Future Matrix Integration
    MatrixBot -.-> MatrixNotifAPI
    MatrixNotifAPI -.-> AAS

    %% Styling
    class U,AAS,ACR,GAI,KIS_Adapter,KIS_DB,CloudDB,GH,GHA,MatrixBot,MatrixNotifAPI default;
