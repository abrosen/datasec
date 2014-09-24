#include <cstdio>
#include <cstdlib>
class rotor{

int modulus;
char *input_order;
char *output_order;
bool im_an_inverter;

public:
rotor();
~rotor();
bool load( char *, char *, bool);
bool inverting();

char forward( char , int);
char reverse( char , int);
int  index_from_symbol( char);
char symbol_from_index( int);
bool turnover(int &);

};


rotor::rotor()
{
	im_an_inverter = false;
	modulus = -1;
}

rotor::~rotor()
{
	if( modulus < 0) return;
	delete [] input_order;
	delete [] output_order;
}

bool rotor::turnover(int &i)
{
	i++;
	if( i >= modulus){ i %=modulus; return true;}
	return false;
}
char rotor::symbol_from_index( int i)
{ return input_order[i];}
// simple getters like this are sort of frowned upon
// could use protected
// but if used in moderation I like this style
bool rotor::inverting(){ return im_an_inverter;}

bool rotor::load( char *in, char *out, bool inv)
{
	im_an_inverter = inv;

	
	for(modulus = 0; ; modulus++)
	if( in[modulus] == '\0') break; //gets modulus to the appropriate value

// an error condition
	for( int i=0; i< modulus; i++)
		if(out[i] == '\0') {modulus = -1; return false;}
// the other error condition is iff there is a character in input
// not in output or in output and not in input

	int count;
	count = 0;
	for( int i=0; i< modulus; i++)
	{
		for( int j=0; j< modulus; j++)
			if( out[j] == in[i]) count++;  /*Checks for 1-to-1 mapping*/
// can't have things that point to themselves ? 
//		if( out[i] == in[i]) return false;
// certainly not in inverters
		if( im_an_inverter && out[i] == in[i])
				{modulus = -1; return false;}
	}
// since they are already the same size I don't have to do this twice
	if( count != modulus) return false;
	


	// Input has been sanitized



	input_order = new char[modulus];
	output_order = new char[modulus];
	if( !im_an_inverter)
	{
		for( int i=0; i< modulus; i++)
		{
			input_order[i] = in[i];
			output_order[i] = out[i];
		}	

		return true;
	}
	
// unlike general rotors 
// inverters have to have  'a'->'z' imply 'z' -> 'a'
// we'll use the same scrambled alphabet, but
// force it to have this mapping in a first come first pick basis.
	for( int i=0; i< modulus; i++)
		input_order[i] = in[i];
	for( int i=0; i< modulus; i++)
		output_order[i] = '\0';
	for( int i=0; i< modulus; i++)
	{
		if( output_order[i] != '\0') continue;	
		if( output_order[index_from_symbol(out[i])] != '\0') continue;
		output_order[i] = out[i];
		for( int j=0; j< modulus; j++)
			if( input_order[j] == output_order[i])
			{

			if( output_order[j] != '\0') continue;
				output_order[j] = input_order[i];
//	printf("%d %d %c %c %c %c\n",i,j ,input_order[i], output_order[i], input_order[j], output_order[j]);
//	fflush(stdout);
				break;
			}
	}
	for( int i=0; i< modulus; i++)
	if( output_order[i] == '\0') output_order[i] = input_order[i];

//	printf("%s\n%s\n", input_order, output_order);

// error checking code to be commented out after testing
//	for( int i= 0; i< modulus; i++)
//		if( output_order[i] == '\0') return false;


	return true;
}

char rotor::forward( char a , int offset)
{

// classic enigma had a fixed inverter so we'll just skip whatever was input
// change this if you want a type-X machine
	if( im_an_inverter) offset = 0;
	int who;
	for( who=0; who< modulus; who++)
		if( input_order[who] == a) break;
	who += offset;
	who = who % modulus;
	return output_order[who];
}

char rotor::reverse( char a , int offset)
{


// classic enigma had a fixed inverter so we'll just skip whatever was input
// change this if you want a type-X machine
	if( im_an_inverter) offset = 0;
	int who;
	for( who=0; who< modulus; who++)
		if( output_order[who] == a) break;
	who -= offset;
	if( who < 0) who += modulus;
	who = who % modulus;
	return input_order[who];
}


int  rotor::index_from_symbol( char a)
{
	for( int i=0; i< modulus; i++)
		if( input_order[i] == a) return i;
	return -1;
}

