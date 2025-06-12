graph TB
    %% Hospital Layer with Encryption
    subgraph "Hospital Infrastructure (On-Premise)"
        KIS["🏥 Hospital KIS<br/>Medical Data Source"]
        ADAPTER["🔌 KIS Adapter<br/>- Data Pseudonymization<br/>- Field-Level Encryption<br/>- TLS 1.3 Connection"]
        HSM["🔐 Hospital HSM<br/>Hardware Security Module<br/>- Master Key Storage<br/>- Certificate Authority"]
    end

    %% Encryption Gateway
    subgraph "Secure Gateway Layer"
        GATEWAY["🛡️ Azure Application Gateway<br/>- WAF Protection<br/>- SSL Termination<br/>- IP Filtering"]
        APIM["🔗 Azure API Management<br/>- OAuth 2.0 + JWT<br/>- Rate Limiting<br/>- Request Validation"]
    end

    %% Azure Secure Infrastructure
    subgraph "Azure Cloud (Germany Central)"
        subgraph "Encryption & Key Management"
            VAULT["🔑 Azure Key Vault<br/>- Encryption Keys (AES-256)<br/>- API Keys<br/>- Certificates<br/>- Hardware-backed"]
            CMK["🔐 Customer Managed Keys<br/>- BYOK (Bring Your Own Key)<br/>- HSM-backed"]
        end
        
        subgraph "Secure Compute"
            ACA["🚀 Container Apps<br/>- Encrypted at Rest<br/>- Encrypted in Memory<br/>- Private Endpoints"]
            STORAGE["💾 Azure Storage<br/>- AES-256 Encryption<br/>- Private Access<br/>- Immutable Policies"]
        end
        
        subgraph "Network Security"
            VNET["🌐 Virtual Network<br/>- Private Subnets<br/>- NSG Rules<br/>- No Public IPs"]
            FIREWALL["🔥 Azure Firewall<br/>- Outbound Filtering<br/>- Threat Intelligence"]
        end
    end

    %% Secure AI Processing
    subgraph "AI Processing Layer"
        PROXY["🤖 AI Proxy Service<br/>- Data Anonymization<br/>- Request Filtering<br/>- Response Sanitization"]
        GOOGLE["🧠 Google AI (Vertex AI)<br/>- Private Service Connect<br/>- Regional Processing<br/>- No Data Retention"]
    end

    %% Secure User Access
    subgraph "Secure User Access"
        AAD["🔐 Azure AD<br/>- MFA Required<br/>- Conditional Access<br/>- PIM (Privileged Identity)"]
        BROWSER["🌐 Hospital Workstation<br/>- Certificate-based Auth<br/>- Device Compliance<br/>- VPN Required"]
    end

    %% Data Flow with Encryption
    KIS -->|"TLS 1.3<br/>Mutual Auth"| ADAPTER
    ADAPTER -->|"Encrypted Payload<br/>AES-256-GCM"| GATEWAY
    GATEWAY -->|"Zero Trust<br/>mTLS"| APIM
    APIM -->|"JWT + Encryption"| ACA
    
    ACA <-->|"Field Encryption<br/>E2E Security"| VAULT
    ACA <-->|"Anonymized Data<br/>HTTPS"| PROXY
    PROXY <-->|"No PII<br/>Encrypted Channel"| GOOGLE
    
    BROWSER <-->|"Zero Trust<br/>Certificate Auth"| AAD
    AAD <-->|"RBAC + MFA"| GATEWAY
    
    HSM -.->|"Key Escrow"| CMK
    VAULT <-->|"HSM-backed"| CMK
    
    %% Audit and Monitoring
    subgraph "Security Monitoring"
        SENTINEL["🔍 Azure Sentinel<br/>- Security Analytics<br/>- Threat Detection<br/>- Incident Response"]
        MONITOR["📊 Azure Monitor<br/>- Audit Logs<br/>- Compliance Reports<br/>- Real-time Alerts"]
    end
    
    ACA -.->|"Security Logs"| SENTINEL
    VAULT -.->|"Access Logs"| MONITOR
    
    %% Styling
    classDef hospital fill:#28a745,stroke:#1e7e34,stroke-width:3px,color:#fff
    classDef security fill:#dc3545,stroke:#c82333,stroke-width:3px,color:#fff
    classDef azure fill:#0078d4,stroke:#005a9e,stroke-width:2px,color:#fff
    classDef ai fill:#ff6b35,stroke:#e55a2b,stroke-width:2px,color:#fff
    classDef user fill:#ffc107,stroke:#e0a800,stroke-width:2px,color:#000
    classDef monitoring fill:#6f42c1,stroke:#5a32a3,stroke-width:2px,color:#fff
    
    class KIS,ADAPTER,HSM hospital
    class GATEWAY,APIM,VAULT,CMK security
    class ACA,STORAGE,VNET,FIREWALL azure
    class PROXY,GOOGLE ai
    class AAD,BROWSER user
    class SENTINEL,MONITOR monitoring
