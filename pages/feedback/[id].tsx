import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  options: any;
  required: boolean;
  order_index: number;
}

interface FeedbackForm {
  id: string;
  name: string;
  description: string;
  questions: Question[];
}

export default function FeedbackFormPage() {
  const router = useRouter();
  const { id } = router.query;
  
  const [form, setForm] = useState<FeedbackForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [responses, setResponses] = useState<{ [questionId: string]: any }>({});

  useEffect(() => {
    if (id) {
      loadForm();
    }
  }, [id]);

  const loadForm = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/feedback/forms/${id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load form');
      }

      setForm(data.form);
    } catch (err) {
      logger.error('Error loading feedback form', { error: err, formId: id });
      setError(err instanceof Error ? err.message : 'Failed to load form');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (questionId: string, value: any) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      // Get current user if logged in
      const { data: { user } } = await supabase.auth.getUser();
      
      // Prepare response data
      const responseData = {
        form_id: form!.id,
        responses: Object.entries(responses).map(([questionId, answer]) => ({
          question_id: questionId,
          answer: answer
        })),
        user_id: user?.id || null,
        user_email: user?.email || 'anonymous@example.com',
        user_name: user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Anonymous'
      };

      const response = await fetch('/api/feedback/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(responseData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit feedback');
      }

      setSubmitted(true);
      logger.info('Feedback submitted successfully', { formId: form!.id, responseId: result.responseId });
    } catch (err) {
      logger.error('Error submitting feedback', { error: err, formId: form!.id });
      setError(err instanceof Error ? err.message : 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  const renderQuestion = (question: Question) => {
    const value = responses[question.id] || '';

    switch (question.question_type) {
      case 'rating':
        const scale = question.options?.scale || 5;
        const labels = question.options?.labels || [];
        return (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">
                {labels[0] || '1'}
              </span>
              <span className="text-sm text-gray-600">
                {labels[labels.length - 1] || scale}
              </span>
            </div>
            <div className="flex gap-2 justify-center">
              {Array.from({ length: scale }, (_, i) => i + 1).map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleInputChange(question.id, num)}
                  className={`w-10 h-10 rounded-full border-2 font-medium transition-colors ${
                    value === num
                      ? 'border-blue-500 bg-blue-500 text-white'
                      : 'border-gray-300 text-gray-600 hover:border-blue-300'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
            {question.options?.nps && (
              <p className="text-xs text-center text-gray-500">
                0 = Not at all likely, 10 = Extremely likely
              </p>
            )}
          </div>
        );

      case 'multiple_choice':
        const options = question.options?.options || [];
        const multiple = question.options?.multiple || false;
        
        if (multiple) {
          return (
            <div className="space-y-2">
              {options.map((option: string) => (
                <label key={option} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={Array.isArray(value) ? value.includes(option) : false}
                    onChange={(e) => {
                      const currentValue = Array.isArray(value) ? value : [];
                      if (e.target.checked) {
                        handleInputChange(question.id, [...currentValue, option]);
                      } else {
                        handleInputChange(question.id, currentValue.filter(v => v !== option));
                      }
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-700">{option}</span>
                </label>
              ))}
            </div>
          );
        } else {
          return (
            <div className="space-y-2">
              {options.map((option: string) => (
                <label key={option} className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name={question.id}
                    value={option}
                    checked={value === option}
                    onChange={(e) => handleInputChange(question.id, e.target.value)}
                    className="border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-700">{option}</span>
                </label>
              ))}
            </div>
          );
        }

      case 'text':
        return (
          <textarea
            value={value}
            onChange={(e) => handleInputChange(question.id, e.target.value)}
            placeholder={question.options?.placeholder || 'Enter your response...'}
            rows={4}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        );

      case 'yes_no':
        return (
          <div className="flex gap-4">
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name={question.id}
                value="yes"
                checked={value === 'yes'}
                onChange={(e) => handleInputChange(question.id, e.target.value)}
                className="border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-gray-700">Yes</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name={question.id}
                value="no"
                checked={value === 'no'}
                onChange={(e) => handleInputChange(question.id, e.target.value)}
                className="border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-gray-700">No</span>
            </label>
          </div>
        );

      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleInputChange(question.id, e.target.value)}
            placeholder="Enter your response..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-3xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="animate-pulse space-y-6">
              <div className="h-6 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="border-b border-gray-200 pb-4">
                    <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
                    <div className="h-10 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-3xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.888-.833-2.598 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Form Not Found</h1>
              <p className="text-gray-600 mb-6">{error}</p>
              <button
                onClick={() => router.push('/')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
              >
                Return to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 py-12">
        <div className="max-w-3xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {/* Success Header */}
            <div className="bg-gradient-to-r from-green-600 to-blue-600 p-8 text-white">
              <div className="text-center">
                <div className="text-4xl mb-3">🎉</div>
                <h1 className="text-2xl font-bold mb-2">Thank You!</h1>
                <p className="text-green-100">Your feedback has been received</p>
              </div>
            </div>
            
            <div className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              
              <h2 className="text-xl font-bold text-gray-900 mb-4">Your Voice Makes a Difference!</h2>
              
              <div className="mb-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-gray-700 mb-3">
                  <strong>🌊 What happens next?</strong>
                </p>
                <ul className="text-sm text-gray-600 text-left space-y-2">
                  <li>• Your feedback will be reviewed by our education team</li>
                  <li>• We'll use your insights to improve Riverwalks for all users</li>
                  <li>• Major updates will be shared in our newsletter</li>
                </ul>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => router.push('/river-walks')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  🗺️ Explore River Walks
                </button>
                <button
                  onClick={() => router.push('/')}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Return to Home
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!form) {
    return null;
  }

  // Check if form is valid and has questions
  if (!form.questions || form.questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-3xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Form Not Ready</h1>
              <p className="text-gray-600 mb-6">
                This feedback form is not yet ready for responses.
              </p>
              <button
                onClick={() => router.push('/')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
              >
                Return to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const requiredQuestions = form.questions.filter(q => q.required);
  const answeredRequired = requiredQuestions.every(q => {
    const answer = responses[q.id];
    return answer !== undefined && answer !== '' && (!Array.isArray(answer) || answer.length > 0);
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 py-12">
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Riverwalks Header */}
          <div className="bg-gradient-to-r from-blue-600 to-green-600 p-8 text-white">
            <div className="text-center">
              <div className="text-4xl mb-3">🌊</div>
              <h1 className="text-2xl font-bold mb-2">Riverwalks Feedback</h1>
              <p className="text-blue-100">Help us improve geography education for everyone</p>
            </div>
          </div>
          
          <div className="p-8 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{form.name}</h2>
            {form.description && (
              <p className="text-gray-600">{form.description}</p>
            )}
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>💡 Your voice matters!</strong> This feedback helps us create better resources for geography students and teachers.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-8">
            <div className="space-y-8">
              {form.questions
                .sort((a, b) => a.order_index - b.order_index)
                .map((question, index) => (
                <div key={question.id} className="border-b border-gray-200 pb-8 last:border-b-0">
                  <label className="block text-lg font-medium text-gray-900 mb-4">
                    {index + 1}. {question.question_text}
                    {question.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  {renderQuestion(question)}
                </div>
              ))}
            </div>

            {error && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                <p className="text-sm text-gray-500">
                  {requiredQuestions.length > 0 && (
                    <>* Required fields ({answeredRequired ? 'All' : `${Object.keys(responses).length}`} of {requiredQuestions.length} completed)</>
                  )}
                </p>
                <button
                  type="submit"
                  disabled={submitting || !answeredRequired}
                  className="w-full sm:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg flex items-center justify-center transition-colors"
                >
                  {submitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Submitting...
                    </>
                  ) : (
                    'Submit Feedback'
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}