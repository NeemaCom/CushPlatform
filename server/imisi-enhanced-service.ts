import { GoogleGenAI } from "@google/genai";
import { storage } from './storage';
import type { User } from '../shared/schema';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface MigrationPathway {
  id: string;
  name: string;
  eligibility: string[];
  requirements: string[];
  timeline: string;
  cost: number;
  successRate: number;
  steps: PathwayStep[];
}

export interface PathwayStep {
  id: string;
  title: string;
  description: string;
  estimatedTime: string;
  documents: string[];
  cost?: number;
  isCompleted: boolean;
}

export interface FinancialPlan {
  totalCost: number;
  breakdown: {
    visaFees: number;
    travelCosts: number;
    initialSettlement: number;
    livingExpenses: number;
    emergencyFund: number;
  };
  fundingSources: string[];
  timeline: string;
  monthlyBudget: number;
}

export interface UserMigrationProfile {
  userId: number;
  targetCountry: string;
  currentCountry: string;
  profession: string;
  education: string;
  languageSkills: string[];
  workExperience: number;
  age: number;
  familySize: number;
  budget: number;
  preferredPathway?: string;
  currentStep?: string;
  completedSteps: string[];
}

export class ImisiEnhancedService {
  private model = "gemini-2.5-pro";

  async generateMigrationAssessment(userProfile: UserMigrationProfile): Promise<{
    eligiblePathways: MigrationPathway[];
    recommendedPathway: MigrationPathway;
    financialPlan: FinancialPlan;
    nextSteps: string[];
  }> {
    try {
      const prompt = `
      You are Imisi, an AI migration concierge. Analyze this user profile and provide comprehensive migration guidance:

      User Profile:
      - Target Country: ${userProfile.targetCountry}
      - Current Country: ${userProfile.currentCountry}
      - Profession: ${userProfile.profession}
      - Education: ${userProfile.education}
      - Languages: ${userProfile.languageSkills.join(', ')}
      - Work Experience: ${userProfile.workExperience} years
      - Age: ${userProfile.age}
      - Family Size: ${userProfile.familySize}
      - Budget: $${userProfile.budget}

      Provide a detailed assessment in JSON format:
      {
        "eligiblePathways": [
          {
            "id": "express_entry",
            "name": "Express Entry (Federal Skilled Worker)",
            "eligibility": ["Requirements list"],
            "requirements": ["Documents needed"],
            "timeline": "6-12 months",
            "cost": 5000,
            "successRate": 85,
            "steps": [
              {
                "id": "language_test",
                "title": "Language Proficiency Test",
                "description": "Take IELTS or CELPIP",
                "estimatedTime": "2-4 weeks",
                "documents": ["Test results"],
                "cost": 300,
                "isCompleted": false
              }
            ]
          }
        ],
        "recommendedPathway": "Most suitable pathway object",
        "financialPlan": {
          "totalCost": 15000,
          "breakdown": {
            "visaFees": 1500,
            "travelCosts": 2000,
            "initialSettlement": 8000,
            "livingExpenses": 3000,
            "emergencyFund": 500
          },
          "fundingSources": ["Personal savings", "Family support"],
          "timeline": "12 months",
          "monthlyBudget": 1250
        },
        "nextSteps": ["Immediate action items"]
      }

      Focus on accuracy and provide realistic timelines and costs for ${userProfile.targetCountry}.
      `;

      const response = await ai.models.generateContent({
        model: this.model,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              eligiblePathways: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    name: { type: "string" },
                    eligibility: { type: "array", items: { type: "string" } },
                    requirements: { type: "array", items: { type: "string" } },
                    timeline: { type: "string" },
                    cost: { type: "number" },
                    successRate: { type: "number" },
                    steps: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          title: { type: "string" },
                          description: { type: "string" },
                          estimatedTime: { type: "string" },
                          documents: { type: "array", items: { type: "string" } },
                          cost: { type: "number" },
                          isCompleted: { type: "boolean" }
                        }
                      }
                    }
                  }
                }
              },
              recommendedPathway: { type: "object" },
              financialPlan: { type: "object" },
              nextSteps: { type: "array", items: { type: "string" } }
            }
          }
        },
        contents: prompt
      });

      return JSON.parse(response.text);
    } catch (error) {
      console.error('Error generating migration assessment:', error);
      return this.generateFallbackAssessment(userProfile);
    }
  }

  async generatePersonalizedGuidance(
    userProfile: UserMigrationProfile, 
    query: string
  ): Promise<{
    response: string;
    suggestions: string[];
    resources: Array<{ title: string; url: string; type: string; }>;
    actionItems: string[];
  }> {
    try {
      const prompt = `
      You are Imisi, an empathetic AI migration concierge. The user is asking: "${query}"

      User Context:
      - Target Country: ${userProfile.targetCountry}
      - Current Status: Planning migration from ${userProfile.currentCountry}
      - Profession: ${userProfile.profession}
      - Current Step: ${userProfile.currentStep || 'Initial planning'}
      - Completed Steps: ${userProfile.completedSteps.join(', ') || 'None yet'}

      Provide a helpful, supportive response with:
      1. Direct answer to their question
      2. Practical suggestions
      3. Relevant resources
      4. Next action items

      Respond in JSON format:
      {
        "response": "Detailed, empathetic response addressing their query",
        "suggestions": ["Practical suggestion 1", "Practical suggestion 2"],
        "resources": [
          {
            "title": "Official Government Guide",
            "url": "https://example.gov/immigration",
            "type": "official"
          }
        ],
        "actionItems": ["Specific action they should take next"]
      }

      Keep tone supportive and professional. Focus on actionable guidance.
      `;

      const response = await ai.models.generateContent({
        model: this.model,
        config: {
          responseMimeType: "application/json"
        },
        contents: prompt
      });

      return JSON.parse(response.text);
    } catch (error) {
      console.error('Error generating personalized guidance:', error);
      return {
        response: "I'm here to help with your migration journey. Could you please rephrase your question?",
        suggestions: [
          "Ask about visa requirements for your target country",
          "Inquire about document preparation steps",
          "Get financial planning guidance"
        ],
        resources: [],
        actionItems: ["Consider booking a consultation for personalized guidance"]
      };
    }
  }

  async generateFinancialBreakdown(userProfile: UserMigrationProfile): Promise<FinancialPlan> {
    try {
      const prompt = `
      Generate a detailed financial plan for migration to ${userProfile.targetCountry}:

      User Details:
      - Current Country: ${userProfile.currentCountry}
      - Family Size: ${userProfile.familySize}
      - Available Budget: $${userProfile.budget}
      - Profession: ${userProfile.profession}

      Provide realistic cost breakdown in JSON format:
      {
        "totalCost": 25000,
        "breakdown": {
          "visaFees": 2000,
          "travelCosts": 3000,
          "initialSettlement": 12000,
          "livingExpenses": 6000,
          "emergencyFund": 2000
        },
        "fundingSources": ["Personal savings", "Bank loan", "Family support"],
        "timeline": "18 months",
        "monthlyBudget": 1400
      }

      Base costs on current ${userProfile.targetCountry} immigration fees and living costs.
      `;

      const response = await ai.models.generateContent({
        model: this.model,
        config: {
          responseMimeType: "application/json"
        },
        contents: prompt
      });

      return JSON.parse(response.text);
    } catch (error) {
      console.error('Error generating financial breakdown:', error);
      return this.generateFallbackFinancialPlan(userProfile);
    }
  }

  async generatePreDepartureChecklist(userProfile: UserMigrationProfile): Promise<{
    categories: Array<{
      name: string;
      items: Array<{
        task: string;
        deadline: string;
        priority: 'high' | 'medium' | 'low';
        completed: boolean;
        description: string;
      }>;
    }>;
  }> {
    const prompt = `
    Generate a comprehensive pre-departure checklist for migration to ${userProfile.targetCountry}:

    User Profile:
    - Target: ${userProfile.targetCountry}
    - Family Size: ${userProfile.familySize}
    - Departure Timeline: Assume 3 months

    Organize in categories (Documents, Financial, Travel, etc.) with specific tasks, deadlines, and priorities.
    `;

    try {
      const response = await ai.models.generateContent({
        model: this.model,
        config: {
          responseMimeType: "application/json"
        },
        contents: prompt
      });

      return JSON.parse(response.text);
    } catch (error) {
      return this.generateFallbackChecklist(userProfile);
    }
  }

  private generateFallbackAssessment(userProfile: UserMigrationProfile) {
    return {
      eligiblePathways: [
        {
          id: "skilled_worker",
          name: "Skilled Worker Program",
          eligibility: ["Bachelor's degree", "2+ years work experience", "Language proficiency"],
          requirements: ["Educational credentials", "Work experience letters", "Language test results"],
          timeline: "8-12 months",
          cost: 5000,
          successRate: 75,
          steps: [
            {
              id: "education_assessment",
              title: "Educational Credential Assessment",
              description: "Get your education evaluated by recognized agency",
              estimatedTime: "6-8 weeks",
              documents: ["Degree certificates", "Transcripts"],
              cost: 500,
              isCompleted: false
            }
          ]
        }
      ],
      recommendedPathway: {
        id: "skilled_worker",
        name: "Skilled Worker Program",
        eligibility: ["Bachelor's degree", "2+ years work experience"],
        requirements: ["Educational credentials", "Work experience letters"],
        timeline: "8-12 months",
        cost: 5000,
        successRate: 75,
        steps: []
      },
      financialPlan: this.generateFallbackFinancialPlan(userProfile),
      nextSteps: [
        "Complete language proficiency test",
        "Gather educational documents",
        "Research job opportunities in target country"
      ]
    };
  }

  private generateFallbackFinancialPlan(userProfile: UserMigrationProfile): FinancialPlan {
    const baseCost = userProfile.familySize * 8000;
    return {
      totalCost: baseCost,
      breakdown: {
        visaFees: Math.round(baseCost * 0.15),
        travelCosts: Math.round(baseCost * 0.20),
        initialSettlement: Math.round(baseCost * 0.40),
        livingExpenses: Math.round(baseCost * 0.20),
        emergencyFund: Math.round(baseCost * 0.05)
      },
      fundingSources: ["Personal savings", "Family support"],
      timeline: "12-18 months",
      monthlyBudget: Math.round(baseCost / 15)
    };
  }

  private generateFallbackChecklist(userProfile: UserMigrationProfile) {
    return {
      categories: [
        {
          name: "Documents",
          items: [
            {
              task: "Gather passport and travel documents",
              deadline: "3 months before",
              priority: "high" as const,
              completed: false,
              description: "Ensure passport is valid for at least 6 months"
            },
            {
              task: "Educational credential assessment",
              deadline: "2 months before",
              priority: "high" as const,
              completed: false,
              description: "Get degrees evaluated by recognized agency"
            }
          ]
        },
        {
          name: "Financial",
          items: [
            {
              task: "Open international bank account",
              deadline: "1 month before",
              priority: "medium" as const,
              completed: false,
              description: "Research banking options in destination country"
            }
          ]
        }
      ]
    };
  }
}

export const imisiEnhancedService = new ImisiEnhancedService();