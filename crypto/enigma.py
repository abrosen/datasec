corpus  =  open("cipher.problem.2").read()

rotors = [
("abcdefghijklmnopqrstuvwxyz", "abcghidefjklpqrmnostxyzuvw",False), 
("abcdefghijklmnopqrstuvwxyz", "defghijklmnopqrstuvwxyzabc",False), 
("abcdefghijklmnopqrstuvwxyz", "zxbcdefghijklnmpqosrtuvway",False), 
("abcdefghijklmnopqrstuvwxyz", "zxbcdefghijklosrtuvwaynmpq",False), 
("abcdefghijklmnopqrstuvwxyz", "abcghidefjklpqrmnostxyzuvw",False), 
("abcdefghijklmnopqrstuvwxyz", "defghijklmnopqrstuvwxyzabc",False), 
("abcdefghijklmnopqrstuvwxyz", "zxbcdefghijklnmpqosrtuvway",False), 
("abcdefghijklmnopqrstuvwxyz", "zxbcdefghijklosrtuvwaynmpq",False), 
("abcdefghijklmnopqrstuvwxyz", "abcghidefjklpqrmnostxyzuvw",False), 
("abcdefghijklmnopqrstuvwxyz", "zyabcdefghijklmnopqrstxwuv",True)
]


def makeBank(rotors):
    bank = {}
    for incoming, outgoing in zip(rotor[0],rotor[1]):
        bank[incoming] = outgoing
    return bank


def encrypt(plaintext, banks):
	
	pass

